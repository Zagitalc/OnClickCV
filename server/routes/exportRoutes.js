const express = require("express");
const { rateLimit } = require("express-rate-limit");
const router = express.Router();
const {
  exportPDF,
  exportWord
} = require("../controllers/exportController");
const { config } = require("../config");
const { createJsonParser } = require("../middleware/http");
const { validateExportRequest } = require("../utils/cvPayload");

const exportLimiter = rateLimit({
  windowMs: config.exportRateLimitWindowMs,
  limit: config.exportRateLimitMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil(config.exportRateLimitWindowMs / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: "export_rate_limited",
      message: "Too many export requests. Please try again later."
    });
  }
});

const validateRequest = (req, res, next) => {
  const result = validateExportRequest(req.body);
  if (!result.ok) {
    return res.status(result.status).json({
      error: result.code,
      message: "Export request validation failed.",
      details: result.errors
    });
  }
  req.exportRequest = result.value;
  return next();
};

// PDF Export
router.post("/pdf", createJsonParser(express, config.exportBodyLimit), exportLimiter, validateRequest, exportPDF);

// Word Export
router.post("/word", createJsonParser(express, config.exportBodyLimit), exportLimiter, validateRequest, exportWord);

module.exports = router;
