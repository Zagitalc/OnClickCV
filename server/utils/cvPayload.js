const { z } = require("zod");
const { sanitizeRichText } = require("./richText");
const { normalizeSectionLayout } = require("./sectionLayout");

const CURRENT_SCHEMA_VERSION = 4;
const MAX_DEPTH = 12;
const MAX_ARRAY_DEPTH = 4;
const MAX_NODES = 800;
const MAX_STRING_LENGTH = 20_000;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const plainString = z.string().max(MAX_STRING_LENGTH).transform((value) => value.trim());
const richString = z.string().max(MAX_STRING_LENGTH).transform(sanitizeRichText);
const richArray = z.array(richString).max(50);

const educationSchema = z.object({
    degree: plainString.default(""),
    school: plainString.default(""),
    location: plainString.default(""),
    startDate: plainString.default(""),
    endDate: plainString.default(""),
    additionalInfo: richString.default("")
}).strict();

const sectionLayoutSchema = z.object({
    left: z.array(z.string().max(64)).max(20).default([]),
    right: z.array(z.string().max(64)).max(20).default([]),
    editorCardOrder: z.array(z.string().max(64)).max(20).default([])
}).strict();

const cvDataSchema = z.object({
    name: plainString.default(""),
    email: plainString.default(""),
    phone: plainString.default(""),
    linkedin: plainString.default(""),
    summary: plainString.default(""),
    workExperience: richArray.default([]),
    volunteerExperience: richArray.default([]),
    education: z.array(educationSchema).max(20).default([]),
    skills: z.array(plainString).max(100).default([]),
    projects: richArray.default([]),
    certifications: richArray.default([]),
    awards: richArray.default([]),
    additionalInfo: richString.default(""),
    interests: plainString.default(""),
    sectionLayout: sectionLayoutSchema.default({})
}).strict();

const exportRequestSchema = z.object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    cvData: cvDataSchema,
    template: z.enum(["A", "B", "C"]).default("A"),
    filename: z.string().max(120).optional()
}).strict();

const isPlainObject = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const inspectComplexity = (root) => {
    const stack = [{ value: root, depth: 0, arrayDepth: 0 }];
    let nodes = 0;

    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > MAX_NODES) {
            return "Request contains too many values.";
        }
        if (current.depth > MAX_DEPTH) {
            return "Request exceeds the maximum nesting depth.";
        }

        if (Array.isArray(current.value)) {
            if (current.arrayDepth >= MAX_ARRAY_DEPTH) {
                return "Request exceeds the maximum array nesting depth.";
            }
            for (let index = 0; index < current.value.length; index += 1) {
                if (!Object.prototype.hasOwnProperty.call(current.value, index)) {
                    return "Sparse arrays are not supported.";
                }
                stack.push({
                    value: current.value[index],
                    depth: current.depth + 1,
                    arrayDepth: current.arrayDepth + 1
                });
            }
            continue;
        }

        if (current.value && typeof current.value === "object") {
            if (!isPlainObject(current.value)) {
                return "Only plain JSON objects are supported.";
            }
            for (const [key, value] of Object.entries(current.value)) {
                if (DANGEROUS_KEYS.has(key) || key.startsWith("$") || key.includes(".")) {
                    return "Request contains a forbidden property name.";
                }
                stack.push({
                    value,
                    depth: current.depth + 1,
                    arrayDepth: current.arrayDepth
                });
            }
            continue;
        }

        if (typeof current.value === "string" && current.value.length > MAX_STRING_LENGTH) {
            return "Request contains a string that exceeds the maximum length.";
        }
    }

    return "";
};

const migrateExportRequest = (payload) => {
    if (!isPlainObject(payload)) {
        return { error: "Request body must be a JSON object." };
    }

    if (payload.schemaVersion === undefined) {
        const keys = Object.keys(payload).sort();
        const historicalKeys = ["cvData", "template"];
        if (keys.length !== historicalKeys.length || keys.some((key, index) => key !== historicalKeys[index])) {
            return { error: "Unversioned requests must use the historical { cvData, template } shape." };
        }
        return {
            value: {
                schemaVersion: CURRENT_SCHEMA_VERSION,
                cvData: payload.cvData,
                template: payload.template
            }
        };
    }

    if (payload.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return {
            status: 422,
            code: "unsupported_schema_version",
            error: `schemaVersion ${String(payload.schemaVersion)} is not supported.`
        };
    }

    return { value: payload };
};

const validateTrustedCvData = (value) => {
    const complexityError = inspectComplexity(value);
    if (complexityError) {
        return { ok: false, errors: [complexityError] };
    }

    const parsed = cvDataSchema.safeParse(value);
    if (!parsed.success) {
        return {
            ok: false,
            errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "cvData"}: ${issue.message}`)
        };
    }

    const cvData = parsed.data;
    cvData.sectionLayout = normalizeSectionLayout(cvData.sectionLayout, cvData);
    return { ok: true, value: cvData };
};

const validateExportRequest = (payload) => {
    const complexityError = inspectComplexity(payload);
    if (complexityError) {
        return { ok: false, status: 400, code: "invalid_export_request", errors: [complexityError] };
    }

    const migrated = migrateExportRequest(payload);
    if (migrated.error) {
        return {
            ok: false,
            status: migrated.status || 400,
            code: migrated.code || "invalid_export_request",
            errors: [migrated.error]
        };
    }

    const parsed = exportRequestSchema.safeParse(migrated.value);
    if (!parsed.success) {
        return {
            ok: false,
            status: 400,
            code: "invalid_export_request",
            errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "request"}: ${issue.message}`)
        };
    }

    const value = parsed.data;
    value.cvData.sectionLayout = normalizeSectionLayout(value.cvData.sectionLayout, value.cvData);
    return { ok: true, value };
};

module.exports = {
    CURRENT_SCHEMA_VERSION,
    inspectComplexity,
    isPlainObject,
    validateExportRequest,
    validateTrustedCvData
};
