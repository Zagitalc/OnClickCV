const request = require("supertest");
const app = require("../server");

describe("import API", () => {
    it("parses pasted CV text", async () => {
        const response = await request(app)
            .post("/api/import/cv-text")
            .send({
                text: `
                    Jane Doe
                    jane@example.com

                    Profile
                    Frontend developer.

                    Key Skills
                    React, Vite, CSS
                `
            })
            .expect(200);

        expect(response.body.cvData.name).toBe("Jane Doe");
        expect(response.body.cvData.email).toBe("jane@example.com");
        expect(response.body.cvData.summary).toBe("Frontend developer.");
        expect(response.body.cvData.skills).toEqual(["React", "Vite", "CSS"]);
        expect(response.body.warnings[0]).toContain("first draft");
    });

    it("rejects empty text", async () => {
        const response = await request(app)
            .post("/api/import/cv-text")
            .send({ text: "   " })
            .expect(400);

        expect(response.body.error).toBe("CV text is required.");
    });
});
