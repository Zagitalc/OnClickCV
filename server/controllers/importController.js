const { parseCvText } = require("../services/cvTextParser");

const importCvText = (req, res) => {
    const text = String(req.body?.text || "");

    if (!text.trim()) {
        return res.status(400).json({ error: "CV text is required." });
    }

    return res.json(parseCvText(text));
};

module.exports = {
    importCvText
};
