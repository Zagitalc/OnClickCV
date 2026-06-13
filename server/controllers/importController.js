const { parseCvText } = require("../services/cvTextParser");

const importCvText = (req, res) => {
    const keys = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? Object.keys(req.body)
        : [];
    if (keys.length !== 1 || keys[0] !== "text" || typeof req.body.text !== "string") {
        return res.status(400).json({
            error: "invalid_import_request",
            message: "Request body must contain only a text string."
        });
    }

    const text = req.body.text;

    if (!text.trim()) {
        return res.status(400).json({ error: "CV text is required." });
    }
    if (text.length > 100_000) {
        return res.status(413).json({
            error: "import_text_too_large",
            message: "CV text must not exceed 100,000 characters."
        });
    }

    res.set("Cache-Control", "no-store");
    return res.json(parseCvText(text));
};

module.exports = {
    importCvText
};
