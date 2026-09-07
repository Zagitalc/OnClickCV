const { config } = require("../config");

class ExportCapacityError extends Error {
    constructor(code, statusCode, message, retryAfter = null) {
        super(message);
        this.name = "ExportCapacityError";
        this.code = code;
        this.statusCode = statusCode;
        this.retryAfter = retryAfter;
    }
}

class PdfQueue {
    constructor({ maxQueued = config.pdfQueueSize, maxWaitMs = config.pdfQueueWaitMs } = {}) {
        this.maxQueued = maxQueued;
        this.maxWaitMs = maxWaitMs;
        this.active = false;
        this.queue = [];
        this.accepting = true;
    }

    stopAccepting() {
        this.accepting = false;
        this.queue.splice(0).forEach((entry) => {
            clearTimeout(entry.timer);
            entry.reject(new ExportCapacityError(
                "service_shutting_down",
                503,
                "The service is shutting down."
            ));
        });
    }

    async run(task) {
        if (!this.accepting) {
            throw new ExportCapacityError("service_shutting_down", 503, "The service is shutting down.");
        }

        if (!this.active) {
            this.active = true;
            return this.execute(task);
        }

        if (this.queue.length >= this.maxQueued) {
            throw new ExportCapacityError(
                "export_queue_full",
                429,
                "The PDF export queue is full.",
                Math.ceil(this.maxWaitMs / 1000)
            );
        }

        return new Promise((resolve, reject) => {
            const entry = { task, resolve, reject, timer: null };
            entry.timer = setTimeout(() => {
                const index = this.queue.indexOf(entry);
                if (index >= 0) {
                    this.queue.splice(index, 1);
                }
                reject(new ExportCapacityError(
                    "export_queue_timeout",
                    503,
                    "The PDF export queue wait time expired."
                ));
            }, this.maxWaitMs);
            this.queue.push(entry);
        });
    }

    async execute(task) {
        try {
            return await task();
        } finally {
            const next = this.queue.shift();
            if (!next) {
                this.active = false;
            } else {
                clearTimeout(next.timer);
                this.execute(next.task).then(next.resolve, next.reject);
            }
        }
    }
}

class DocxSlots {
    constructor(maxActive = config.docxConcurrency) {
        this.maxActive = maxActive;
        this.active = 0;
        this.accepting = true;
    }

    stopAccepting() {
        this.accepting = false;
    }

    async run(task) {
        if (!this.accepting) {
            throw new ExportCapacityError("service_shutting_down", 503, "The service is shutting down.");
        }
        if (this.active >= this.maxActive) {
            throw new ExportCapacityError(
                "docx_capacity_exceeded",
                503,
                "DOCX export capacity is currently full."
            );
        }

        this.active += 1;
        try {
            return await task();
        } finally {
            this.active -= 1;
        }
    }
}

const pdfQueue = new PdfQueue();
const docxSlots = new DocxSlots();

const stopAcceptingExports = () => {
    pdfQueue.stopAccepting();
    docxSlots.stopAccepting();
};

module.exports = {
    DocxSlots,
    ExportCapacityError,
    PdfQueue,
    docxSlots,
    pdfQueue,
    stopAcceptingExports
};
