const IMPORT_WARNING =
    "This import is a first draft. Please review the detected sections before exporting. Some formatting or section placement may need manual adjustment.";

const SECTION_ALIASES = {
    summary: ["summary", "profile", "professional summary", "personal profile"],
    skills: ["skills", "technical skills", "key skills", "technologies"],
    projects: ["projects", "technical projects", "portfolio"],
    workExperience: ["experience", "work experience", "employment history", "professional experience"],
    volunteerExperience: ["volunteer", "volunteering", "volunteer experience"],
    education: ["education", "academic background"],
    certifications: ["certifications", "certificates", "licenses"],
    awards: ["awards", "achievements"],
    additionalInfo: ["additional information", "other information", "additional info", "other info"]
};

const MONTHS = "(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)";
const DATE_RANGE_PATTERN = new RegExp(`((?:${MONTHS}\\s+)?\\d{4})\\s*[-–—]\\s*((?:${MONTHS}\\s+)?\\d{4}|Present|Current)`, "i");
const YEAR_PATTERN = /\b(19|20)\d{2}\b/;

const createEmptyCvData = () => ({
    name: "",
    email: "",
    phone: "",
    linkedin: "",
    summary: "",
    skills: [],
    projects: [],
    workExperience: [],
    volunteerExperience: [],
    education: [],
    certifications: [],
    awards: [],
    additionalInfo: ""
});

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const stripTrailingHeadingPunctuation = (line = "") =>
    String(line)
        .trim()
        .replace(/[:\-–—]+$/g, "")
        .trim()
        .toLowerCase();

const normalizeText = (text = "") =>
    String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[•●▪]/g, "-")
        .replace(/\u00a0/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

const detectSectionHeading = (line = "") => {
    const cleaned = stripTrailingHeadingPunctuation(line);
    if (!cleaned || cleaned.length > 55) {
        return "";
    }

    return (
        Object.entries(SECTION_ALIASES).find(([, aliases]) => aliases.includes(cleaned))?.[0] || ""
    );
};

const splitIntoSections = (text = "") => {
    const lines = normalizeText(text)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    const sections = { personal: [] };
    let currentSection = "personal";

    lines.forEach((line) => {
        const matchedSection = detectSectionHeading(line);
        if (matchedSection) {
            currentSection = matchedSection;
            sections[currentSection] = sections[currentSection] || [];
            return;
        }

        sections[currentSection] = sections[currentSection] || [];
        sections[currentSection].push(line);
    });

    return sections;
};

const isUrlLine = (line = "") => /https?:\/\/|linkedin\.com|github\.com|www\./i.test(line);
const isContactLine = (line = "") =>
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(line) ||
    /(\+?\d[\d\s().-]{8,}\d)/.test(line) ||
    isUrlLine(line);

const extractPersonalDetails = (sections = {}, fullText = "") => {
    const email = fullText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
    const phone = fullText.match(/(\+?\d[\d\s().-]{8,}\d)/)?.[0] || "";
    const linkedin =
        fullText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] ||
        fullText.match(/(?:www\.)?linkedin\.com\/[^\s]+/i)?.[0] ||
        "";
    const github =
        fullText.match(/https?:\/\/(?:www\.)?github\.com\/[^\s]+/i)?.[0] ||
        fullText.match(/(?:www\.)?github\.com\/[^\s]+/i)?.[0] ||
        "";

    const name = (sections.personal || []).find((line) => {
        if (detectSectionHeading(line) || isContactLine(line)) {
            return false;
        }
        return line.length <= 80 && /[A-Za-z]/.test(line);
    }) || "";

    return { name, email, phone, linkedin, github };
};

const cleanBullet = (line = "") => String(line).replace(/^[-*]\s*/, "").trim();
const isBulletLine = (line = "") => /^[-*]\s+/.test(line.trim());

const linesToRichHtmlEntries = (lines = []) => {
    const entries = [];
    let paragraphs = [];
    let bullets = [];

    const flush = () => {
        if (!paragraphs.length && !bullets.length) {
            return;
        }

        const paragraphHtml = paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
        const bulletHtml = bullets.length
            ? `<ul>${bullets.map((line) => `<li>${escapeHtml(cleanBullet(line))}</li>`).join("")}</ul>`
            : "";
        entries.push(`${paragraphHtml}${bulletHtml}`);
        paragraphs = [];
        bullets = [];
    };

    lines.forEach((line) => {
        if (isBulletLine(line)) {
            bullets.push(line);
            return;
        }

        if (bullets.length) {
            flush();
        }
        paragraphs.push(line);
    });

    flush();
    return entries;
};

const parseSkills = (lines = []) =>
    lines
        .join("\n")
        .split(/[,|;\n]+|(?:\s+-\s+)|(?:^-\s*)/g)
        .map((skill) => skill.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);

const looksLikeDegree = (line = "") =>
    /\b(BSc|BA|MSc|MA|PhD|Bachelor|Master|Computer Science|Foundation|Diploma|Degree|Honours|Honors)\b/i.test(line);

const parseEducation = (lines = []) => {
    const entries = [];
    let current = [];

    const flush = () => {
        const chunk = current.map((line) => line.trim()).filter(Boolean);
        current = [];
        if (!chunk.length) {
            return;
        }

        const dateLine = chunk.find((line) => DATE_RANGE_PATTERN.test(line) || YEAR_PATTERN.test(line)) || "";
        const dateMatch = dateLine.match(DATE_RANGE_PATTERN);
        const startDate = dateMatch?.[1] || "";
        const endDate = dateMatch?.[2] || "";
        const nonDateLines = chunk.filter((line) => line !== dateLine);
        const degree = nonDateLines.find(looksLikeDegree) || "";
        const school = nonDateLines.find((line) => line !== degree) || degree || "";
        const location =
            nonDateLines.find((line) => line !== degree && line !== school && (line.includes(",") || /\bUK\b/i.test(line))) || "";
        const extra = nonDateLines.filter((line) => line !== degree && line !== school && line !== location);

        entries.push({
            degree: degree === school ? "" : degree,
            school,
            location,
            startDate: startDate || (dateLine.match(YEAR_PATTERN)?.[0] || ""),
            endDate,
            additionalInfo: extra.length ? extra.map((line) => `<p>${escapeHtml(line)}</p>`).join("") : ""
        });
    };

    lines.forEach((line) => {
        const startsNewEntry = current.length >= 6 || (current.length > 0 && looksLikeDegree(line) && current.some(looksLikeDegree));
        if (startsNewEntry) {
            flush();
        }
        current.push(line);
    });
    flush();

    return entries.filter((entry) =>
        [entry.degree, entry.school, entry.location, entry.startDate, entry.endDate, entry.additionalInfo].some(Boolean)
    );
};

const parseCvText = (text = "") => {
    const normalized = normalizeText(text);
    const sections = splitIntoSections(normalized);
    const personal = extractPersonalDetails(sections, normalized);
    const cvData = createEmptyCvData();

    cvData.name = personal.name;
    cvData.email = personal.email;
    cvData.phone = personal.phone;
    cvData.linkedin = personal.linkedin;
    cvData.summary = (sections.summary || []).join(" ").trim();
    cvData.skills = parseSkills(sections.skills || []);
    cvData.projects = linesToRichHtmlEntries(sections.projects || []);
    cvData.workExperience = linesToRichHtmlEntries(sections.workExperience || []);
    cvData.volunteerExperience = linesToRichHtmlEntries(sections.volunteerExperience || []);
    cvData.education = parseEducation(sections.education || []);
    cvData.certifications = linesToRichHtmlEntries(sections.certifications || []);
    cvData.awards = linesToRichHtmlEntries(sections.awards || []);

    const additionalBlocks = [];
    if (personal.github) {
        additionalBlocks.push(`<p><strong>GitHub:</strong> ${escapeHtml(personal.github)}</p>`);
    }
    if (sections.additionalInfo?.length) {
        additionalBlocks.push(...sections.additionalInfo.map((line) => `<p>${escapeHtml(line)}</p>`));
    }

    const personalLeftovers = (sections.personal || [])
        .filter((line) => line !== personal.name && !isContactLine(line))
        .filter(Boolean);
    if (personalLeftovers.length) {
        additionalBlocks.push(...personalLeftovers.map((line) => `<p>${escapeHtml(line)}</p>`));
    }

    cvData.additionalInfo = additionalBlocks.join("");

    return {
        cvData,
        warnings: [IMPORT_WARNING]
    };
};

module.exports = {
    IMPORT_WARNING,
    normalizeText,
    detectSectionHeading,
    splitIntoSections,
    parseCvText
};
