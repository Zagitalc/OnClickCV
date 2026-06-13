const { DocxSlots, ExportCapacityError, PdfQueue } = require("../services/exportCapacity");

describe("export capacity controls", () => {
    test("rejects PDF work when the queue is full", async () => {
        const queue = new PdfQueue({ maxQueued: 1, maxWaitMs: 1000 });
        let release;
        const active = queue.run(() => new Promise((resolve) => {
            release = resolve;
        }));
        const queued = queue.run(async () => "queued");

        await expect(queue.run(async () => "overflow")).rejects.toMatchObject({
            code: "export_queue_full",
            statusCode: 429
        });

        release("active");
        await expect(active).resolves.toBe("active");
        await expect(queued).resolves.toBe("queued");
    });

    test("expires queued PDF work independently of execution", async () => {
        const queue = new PdfQueue({ maxQueued: 1, maxWaitMs: 20 });
        let release;
        const active = queue.run(() => new Promise((resolve) => {
            release = resolve;
        }));
        await expect(queue.run(async () => "queued")).rejects.toMatchObject({
            code: "export_queue_timeout",
            statusCode: 503
        });
        release();
        await active;
    });

    test("DOCX slots do not create a waiting queue", async () => {
        const slots = new DocxSlots(1);
        let release;
        const active = slots.run(() => new Promise((resolve) => {
            release = resolve;
        }));
        await expect(slots.run(async () => "overflow")).rejects.toBeInstanceOf(ExportCapacityError);
        release();
        await active;
    });
});
