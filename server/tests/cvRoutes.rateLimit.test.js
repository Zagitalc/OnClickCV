const express = require("express");
const request = require("supertest");

jest.mock("../controllers/cvController", () => ({
    saveCV: (req, res) => res.status(200).json({ saved: true }),
    getCV: (req, res) => res.status(200).json({ userId: req.params.userId })
}));

describe("CV route rate limiting", () => {
    const originalWriteLimit = process.env.CV_WRITE_RATE_LIMIT;
    const originalReadLimit = process.env.CV_READ_RATE_LIMIT;

    beforeEach(() => {
        process.env.CV_WRITE_RATE_LIMIT = "1";
        process.env.CV_READ_RATE_LIMIT = "1";
        jest.resetModules();
    });

    afterAll(() => {
        if (originalWriteLimit === undefined) {
            delete process.env.CV_WRITE_RATE_LIMIT;
        } else {
            process.env.CV_WRITE_RATE_LIMIT = originalWriteLimit;
        }

        if (originalReadLimit === undefined) {
            delete process.env.CV_READ_RATE_LIMIT;
        } else {
            process.env.CV_READ_RATE_LIMIT = originalReadLimit;
        }
    });

    const createApp = () => {
        const app = express();
        app.use(express.json());
        app.use("/api/cv", require("../routes/cvRoutes"));
        return app;
    };

    test("rate limits CV saves", async () => {
        const app = createApp();

        await request(app).post("/api/cv/save").send({}).expect(200);
        const response = await request(app).post("/api/cv/save").send({});

        expect(response.status).toBe(429);
        expect(response.headers).toHaveProperty("ratelimit");
    });

    test("rate limits CV reads independently", async () => {
        const app = createApp();

        await request(app).get("/api/cv/user-1").expect(200);
        const response = await request(app).get("/api/cv/user-1");

        expect(response.status).toBe(429);
        expect(response.headers).toHaveProperty("ratelimit");
    });
});
