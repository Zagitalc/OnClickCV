const request = require("supertest");
const { parseBoolean } = require("../config");
const runtimeState = require("../runtimeState");
const { validateExportRequest, validateTrustedCvData } = require("../utils/cvPayload");
const { extractText, sanitizeRichText } = require("../utils/richText");
const { buildDownloadHeaders, sanitizeFilenameBase } = require("../utils/downloadHeaders");

const makeCvData = () => ({
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "",
    linkedin: "",
    summary: "Engineer",
    workExperience: ["<p><strong>Built systems</strong></p>"],
    volunteerExperience: [],
    education: [],
    skills: ["Node.js"],
    projects: [],
    certifications: [],
    awards: [],
    additionalInfo: "",
    interests: "",
    sectionLayout: { left: [], right: [], editorCardOrder: [] }
});

describe("deployment hardening", () => {
    afterEach(() => {
        runtimeState.resetForTests();
        delete process.env.AI_REVIEW_ENABLED;
        delete process.env.CV_PERSISTENCE_ENABLED;
        jest.resetModules();
    });

    test.each([
        ["true", true],
        [" TRUE ", true],
        ["false", false],
        ["0", false],
        [undefined, false]
    ])("parses feature flag %p strictly", (value, expected) => {
        expect(parseBoolean(value)).toBe(expected);
    });

    test("disabled feature routes return 404 and health reports feature state", async () => {
        process.env.AI_REVIEW_ENABLED = "false";
        process.env.CV_PERSISTENCE_ENABLED = "false";
        jest.resetModules();
        const app = require("../server");

        await request(app).post("/api/ai/review").send({}).expect(404);
        await request(app).get("/api/cv/example").expect(404);

        const health = await request(app).get("/api/health").expect(200);
        expect(health.body.features).toEqual({ ai: false, persistence: false });
        expect(health.body.acceptingRequests).toBe(true);
    });

    test("health returns 503 after shutdown begins", async () => {
        const app = require("../server");
        require("../runtimeState").beginShutdown();
        const response = await request(app).get("/api/health").expect(503);
        expect(response.body.acceptingRequests).toBe(false);
    });

    test("accepts the exact historical export shape and migrates it to schema 4", () => {
        const result = validateExportRequest({ cvData: makeCvData(), template: "A" });
        expect(result.ok).toBe(true);
        expect(result.value.schemaVersion).toBe(4);
    });

    test("rejects unsupported versions and malformed historical shapes", () => {
        expect(validateExportRequest({
            schemaVersion: 5,
            cvData: makeCvData(),
            template: "A"
        })).toMatchObject({ ok: false, status: 422, code: "unsupported_schema_version" });

        expect(validateExportRequest({
            cvData: makeCvData(),
            template: "A",
            unexpected: true
        })).toMatchObject({ ok: false, code: "invalid_export_request" });
    });

    test("rejects dangerous, unknown, and excessively nested values", () => {
        expect(validateTrustedCvData({ ...makeCvData(), $where: "sleep(1)" }).ok).toBe(false);
        expect(validateTrustedCvData({ ...makeCvData(), unknown: "value" }).ok).toBe(false);

        let nested = {};
        for (let index = 0; index < 20; index += 1) {
            nested = { value: nested };
        }
        expect(validateExportRequest(nested).ok).toBe(false);
    });

    test("sanitizes active markup while preserving supported formatting", () => {
        const sanitized = sanitizeRichText(
            '<base href="https://evil.example"><p onclick="alert(1)"><strong>Safe</strong>' +
            '<script>alert(1)</script><a href="javascript:alert(1)">link</a></p>'
        );
        expect(sanitized).toContain("<strong>Safe</strong>");
        expect(sanitized).not.toMatch(/script|onclick|javascript:|<base/i);
        expect(extractText(sanitized)).toBe("Safe link");
    });

    test("builds safe attachment headers", () => {
        expect(sanitizeFilenameBase("../Bad\r\nName")).toBe("BadName");
        const headers = buildDownloadHeaders("Résumé 2026", "pdf", "application/pdf");
        expect(headers["Content-Type"]).toBe("application/pdf");
        expect(headers["Cache-Control"]).toBe("no-store");
        expect(headers["Content-Disposition"]).toContain("filename*=UTF-8''");
        expect(headers["Content-Disposition"]).not.toMatch(/[\r\n]/);
    });

    test("paste-text import rejects unknown fields and oversized text", async () => {
        const app = require("../server");
        await request(app)
            .post("/api/import/cv-text")
            .send({ text: "CV", extra: true })
            .expect(400);

        await request(app)
            .post("/api/import/cv-text")
            .send({ text: "x".repeat(100_001) })
            .expect(413);
    });
});
