const express = require("express");
const { importCvText } = require("../controllers/importController");

const router = express.Router();

router.post("/cv-text", importCvText);

module.exports = router;
