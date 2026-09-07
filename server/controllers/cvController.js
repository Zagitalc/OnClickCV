const CV = require("../models/CV");
const { validateTrustedCvData } = require("../utils/cvPayload");

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

const validateUserId = (value) => {
    const userId = String(value || "").trim();
    return USER_ID_PATTERN.test(userId) ? userId : "";
};

// Save or update a CV
exports.saveCV = async (req, res) => {
    try {
        const { cvData, userId: rawUserId } = req.body || {};
        const validated = validateTrustedCvData(cvData);
        if (!validated.ok) {
            return res.status(400).json({
                error: "invalid_cv_data",
                details: validated.errors
            });
        }

        const userId = rawUserId === undefined ? "" : validateUserId(rawUserId);
        if (rawUserId !== undefined && !userId) {
            return res.status(400).json({ error: "Invalid userId." });
        }

        const trustedCvData = validated.value;
        let cv;
        if (userId) {
            cv = await CV.findOneAndUpdate(
                { userId },
                {
                    $set: {
                        ...trustedCvData,
                        userId,
                        updatedAt: new Date()
                    }
                },
                { upsert: true, new: true, runValidators: true }
            );
        } else {
            cv = await CV.create(trustedCvData);
        }
        res.set("Cache-Control", "no-store");
        res.json(cv);
    } catch (err) {
        res.status(500).json({ error: "Failed to save CV" });
    }
};

// Get a CV by userId
exports.getCV = async (req, res) => {
    try {
        const userId = validateUserId(req.params.userId);
        if (!userId) {
            return res.status(400).json({ error: "Invalid userId." });
        }
        const cv = await CV.findOne({ userId });
        if (!cv) return res.status(404).json({ error: "CV not found" });
        res.set("Cache-Control", "no-store");
        res.json(cv);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch CV" });
    }
};
