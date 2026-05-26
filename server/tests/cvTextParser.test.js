const { detectSectionHeading, parseCvText, splitIntoSections } = require("../services/cvTextParser");

describe("cvTextParser", () => {
    it("extracts personal details and preserves GitHub in additional info", () => {
        const result = parseCvText(`
            Long Hang Chung
            long@example.com
            07826 086566
            https://linkedin.com/in/lchung01
            https://github.com/Zagitalc

            Summary
            Full-stack developer.
        `);

        expect(result.cvData.name).toBe("Long Hang Chung");
        expect(result.cvData.email).toBe("long@example.com");
        expect(result.cvData.phone).toBe("07826 086566");
        expect(result.cvData.linkedin).toBe("https://linkedin.com/in/lchung01");
        expect(result.cvData.additionalInfo).toContain("<strong>GitHub:</strong> https://github.com/Zagitalc");
    });

    it("detects common section aliases", () => {
        expect(detectSectionHeading("Professional Summary")).toBe("summary");
        expect(detectSectionHeading("Technical Skills:")).toBe("skills");
        expect(detectSectionHeading("Employment History")).toBe("workExperience");
        expect(detectSectionHeading("Academic Background")).toBe("education");
    });

    it("splits text into canonical sections", () => {
        const sections = splitIntoSections(`
            Jane Doe
            Profile
            Developer profile
            Technologies
            React, Node.js
        `);

        expect(sections.personal).toContain("Jane Doe");
        expect(sections.summary).toContain("Developer profile");
        expect(sections.skills).toContain("React, Node.js");
    });

    it("splits skills from commas, pipes, semicolons, bullets, and lines", () => {
        const result = parseCvText(`
            Skills
            React, Node.js | Express; PostgreSQL
            - Docker
            Git
        `);

        expect(result.cvData.skills).toEqual(["React", "Node.js", "Express", "PostgreSQL", "Docker", "Git"]);
    });

    it("preserves bullet text as HTML lists", () => {
        const result = parseCvText(`
            Projects
            Shelf Nudge
            - Built a React dashboard
            - Added PostgreSQL filtering
        `);

        expect(result.cvData.projects).toHaveLength(1);
        expect(result.cvData.projects[0]).toContain("<p>Shelf Nudge</p>");
        expect(result.cvData.projects[0]).toContain("<ul>");
        expect(result.cvData.projects[0]).toContain("<li>Built a React dashboard</li>");
    });

    it("parses education entries where possible", () => {
        const result = parseCvText(`
            Education
            Durham University
            BSc Computer Science
            Durham, UK
            Oct 2021 - Jul 2024
            Relevant modules: Web Development
        `);

        expect(result.cvData.education).toHaveLength(1);
        expect(result.cvData.education[0]).toMatchObject({
            school: "Durham University",
            degree: "BSc Computer Science",
            location: "Durham, UK",
            startDate: "Oct 2021",
            endDate: "Jul 2024"
        });
        expect(result.cvData.education[0].additionalInfo).toContain("Relevant modules");
    });

    it("sends unrecognised personal/header leftovers to additional info", () => {
        const result = parseCvText(`
            Jane Doe
            Full UK driving licence
            Reading, UK
        `);

        expect(result.cvData.name).toBe("Jane Doe");
        expect(result.cvData.additionalInfo).toContain("Full UK driving licence");
        expect(result.cvData.additionalInfo).toContain("Reading, UK");
    });
});
