const express = require("express");
const { importCvText } = require("../controllers/importController");
const { config } = require("../config");
const { createJsonParser } = require("../middleware/http");

const router = express.Router();

router.post("/cv-text", createJsonParser(express, config.importBodyLimit), importCvText);

module.exports = router;
