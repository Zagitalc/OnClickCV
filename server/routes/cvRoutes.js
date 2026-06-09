const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const { saveCV, getCV } = require("../controllers/cvController");

const cvWriteLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number.parseInt(process.env.CV_WRITE_RATE_LIMIT || "30", 10),
    standardHeaders: "draft-8",
    legacyHeaders: false
});

const cvReadLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number.parseInt(process.env.CV_READ_RATE_LIMIT || "120", 10),
    standardHeaders: "draft-8",
    legacyHeaders: false
});

// Save or update CV
router.post("/save", cvWriteLimiter, saveCV);

// Get CV by userId
router.get("/:userId", cvReadLimiter, getCV);

module.exports = router;
