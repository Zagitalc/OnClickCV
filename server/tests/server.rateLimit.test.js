const request = require("supertest");

jest.mock("../db", () => jest.fn());

describe("production client fallback rate limiting", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalClientRateLimit = process.env.CLIENT_RATE_LIMIT;

    afterAll(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalClientRateLimit === undefined) {
            delete process.env.CLIENT_RATE_LIMIT;
        } else {
            process.env.CLIENT_RATE_LIMIT = originalClientRateLimit;
        }
    });

    test("returns 429 after the configured request limit", async () => {
        process.env.NODE_ENV = "production";
        process.env.CLIENT_RATE_LIMIT = "2";
        jest.resetModules();

        const app = require("../server");

        await request(app).get("/api/not-found");
        await request(app).get("/api/not-found");
        const response = await request(app).get("/api/not-found");

        expect(response.status).toBe(429);
        expect(response.headers).toHaveProperty("ratelimit");
    });
});
