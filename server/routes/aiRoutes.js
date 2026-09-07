const express = require("express");
const { reviewCV, reviewCVStream } = require("../controllers/aiController");
const { createJsonParser } = require("../middleware/http");

const router = express.Router();

router.post("/review", createJsonParser(express, "250kb"), reviewCV);
router.post("/review/stream", createJsonParser(express, "250kb"), reviewCVStream);

module.exports = router;
