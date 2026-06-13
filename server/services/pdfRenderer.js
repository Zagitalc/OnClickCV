const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { PDFDocument } = require("pdf-lib");
const { config } = require("../config");

const TEMP_ROOT = "/tmp/onclickcv/chromium";
const ABANDONED_AGE_MS = 6 * 60 * 60 * 1000;

const withTimeout = (promise, timeoutMs, onTimeout) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(async () => {
            await onTimeout?.();
            const error = new Error("PDF export exceeded its execution timeout.");
            error.code = "pdf_export_timeout";
            reject(error);
        }, timeoutMs);

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });

const sweepAbandonedProfiles = async () => {
    await fs.mkdir(TEMP_ROOT, { recursive: true, mode: 0o700 });
    const entries = await fs.readdir(TEMP_ROOT, { withFileTypes: true });
    const now = Date.now();
    await Promise.all(entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
            const target = path.join(TEMP_ROOT, entry.name);
            const stats = await fs.stat(target);
            if (now - stats.mtimeMs > ABANDONED_AGE_MS) {
                await fs.rm(target, { recursive: true, force: true });
            }
        }));
};

const renderPdf = async (htmlContent, { isCancelled = () => false } = {}) => {
    const profilePath = path.join(TEMP_ROOT, crypto.randomBytes(18).toString("hex"));
    let browser;
    let page;

    const closeResources = async () => {
        await page?.close().catch(() => {});
        await browser?.close().catch(() => {});
    };

    const operation = (async () => {
        await fs.mkdir(profilePath, { recursive: true, mode: 0o700 });
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
            userDataDir: profilePath,
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--disable-background-networking",
                "--disable-sync",
                "--disable-default-apps",
                "--disable-service-worker"
            ]
        });
        page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            const url = request.url();
            if (url === "about:blank" || url.startsWith("data:")) {
                request.continue().catch(() => {});
                return;
            }
            request.abort("blockedbyclient").catch(() => {});
        });
        page.on("dialog", (dialog) => dialog.dismiss().catch(() => {}));

        if (isCancelled()) {
            const error = new Error("PDF export was cancelled.");
            error.code = "export_cancelled";
            throw error;
        }

        await page.setContent(htmlContent, { waitUntil: "domcontentloaded", timeout: 15_000 });
        await page.evaluate(() => document.fonts?.ready);
        await page.evaluate(() => {
            document.querySelectorAll("a").forEach((element) => element.removeAttribute("href"));
            document.querySelectorAll("form, base, meta[http-equiv='refresh']").forEach((element) => element.remove());
        });

        if (isCancelled()) {
            const error = new Error("PDF export was cancelled.");
            error.code = "export_cancelled";
            throw error;
        }

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true
        });
        const pdf = await PDFDocument.load(pdfBuffer);
        if (pdf.getPageCount() > config.pdfMaxPages) {
            const error = new Error(`PDF exceeds the ${config.pdfMaxPages}-page limit.`);
            error.code = "pdf_page_limit_exceeded";
            throw error;
        }
        return Buffer.from(pdfBuffer);
    })();

    try {
        return await withTimeout(operation, config.pdfExecutionMs, closeResources);
    } finally {
        await closeResources();
        await fs.rm(profilePath, { recursive: true, force: true }).catch(() => {});
    }
};

module.exports = {
    TEMP_ROOT,
    renderPdf,
    sweepAbandonedProfiles
};
