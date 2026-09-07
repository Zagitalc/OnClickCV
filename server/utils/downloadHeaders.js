const path = require("path");

const sanitizeFilenameBase = (value = "") => {
    const normalized = String(value || "")
        .normalize("NFKC")
        .replace(/[\r\n\u0000-\u001f\u007f]/g, "")
        .replace(/[\\/:"*?<>|]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^[_ .]+|[_ .]+$/g, "")
        .slice(0, 80);
    return normalized || "OnClickCV";
};

const encodeFilenameStar = (value) =>
    encodeURIComponent(value)
        .replace(/['()]/g, escape)
        .replace(/\*/g, "%2A");

const buildDownloadHeaders = (requestedName, extension, contentType) => {
    const withoutExtension = path.basename(String(requestedName || "")).replace(/\.(pdf|docx)$/i, "");
    const unicodeBase = sanitizeFilenameBase(withoutExtension);
    const asciiBase = unicodeBase.replace(/[^\x20-\x7E]/g, "_") || "OnClickCV";
    const unicodeFilename = `${unicodeBase}.${extension}`;
    const asciiFilename = `${asciiBase}.${extension}`;

    return {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
        "Content-Disposition":
            `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeFilenameStar(unicodeFilename)}`,
        "X-Content-Type-Options": "nosniff"
    };
};

module.exports = {
    buildDownloadHeaders,
    sanitizeFilenameBase
};
