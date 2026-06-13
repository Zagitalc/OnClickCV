const parseBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return String(value).trim().toLowerCase() === "true";
};

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || "development";

const config = {
    nodeEnv,
    host: process.env.HOST || "0.0.0.0",
    port: parsePositiveInteger(process.env.PORT, 4000),
    release: String(process.env.RENDER_GIT_COMMIT || process.env.RELEASE_SHA || "development").slice(0, 7),
    aiReviewEnabled: parseBoolean(process.env.AI_REVIEW_ENABLED, nodeEnv === "test"),
    cvPersistenceEnabled: parseBoolean(process.env.CV_PERSISTENCE_ENABLED, nodeEnv === "test"),
    importBodyLimit: process.env.IMPORT_BODY_LIMIT || "100kb",
    exportBodyLimit: process.env.EXPORT_BODY_LIMIT || "300kb",
    exportRateLimitMax: parsePositiveInteger(process.env.EXPORT_RATE_LIMIT_MAX, 5),
    exportRateLimitWindowMs: parsePositiveInteger(process.env.EXPORT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    pdfQueueSize: parsePositiveInteger(process.env.PDF_QUEUE_SIZE, 3),
    pdfQueueWaitMs: parsePositiveInteger(process.env.PDF_QUEUE_WAIT_MS, 60 * 1000),
    pdfExecutionMs: parsePositiveInteger(process.env.PDF_EXECUTION_MS, 45 * 1000),
    pdfMaxPages: parsePositiveInteger(process.env.PDF_MAX_PAGES, 5),
    docxConcurrency: parsePositiveInteger(process.env.DOCX_CONCURRENCY, 3),
    docxExecutionMs: parsePositiveInteger(process.env.DOCX_EXECUTION_MS, 20 * 1000),
    shutdownDelayMs: parsePositiveInteger(process.env.SHUTDOWN_DELAY_MS, 60 * 1000)
};

module.exports = {
    config,
    parseBoolean,
    parsePositiveInteger
};
