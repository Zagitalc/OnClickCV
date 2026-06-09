const fs = require("fs");
const path = require("path");

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            return;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) {
            return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!key || process.env[key] !== undefined) {
            return;
        }

        process.env[key] = value;
    });
};

loadEnvFile(path.join(__dirname, ".env"));

const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const aiRoutes = require("./routes/aiRoutes");
const importRoutes = require("./routes/importRoutes");
const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/export", exportRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/import", importRoutes);

const clientBuildPath = path.join(__dirname, "..", "client", "build");
if (process.env.NODE_ENV === "production") {
    app.use(express.static(clientBuildPath));

    const clientFallbackLimiter = rateLimit({
        windowMs: 60 * 1000,
        limit: Number.parseInt(process.env.CLIENT_RATE_LIMIT || "120", 10),
        standardHeaders: "draft-8",
        legacyHeaders: false
    });

    app.get("*", clientFallbackLimiter, (req, res, next) => {
        if (req.path.startsWith("/api/")) {
            return next();
        }
        return res.sendFile(path.join(clientBuildPath, "index.html"));
    });
}

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}

module.exports = app;
