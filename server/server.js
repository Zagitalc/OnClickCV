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
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const aiRoutes = require("./routes/aiRoutes");
const importRoutes = require("./routes/importRoutes");
const connectDB = require("./db");
const { config } = require("./config");
const { handleBodyParserError } = require("./middleware/http");
const runtimeState = require("./runtimeState");
const { stopAcceptingExports } = require("./services/exportCapacity");
const { sweepAbandonedProfiles } = require("./services/pdfRenderer");
const { logRuntimeDiagnostics } = require("./utils/runtimeDiagnostics");

const app = express();
app.set("trust proxy", 1);

if (config.nodeEnv !== "test") {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                frameAncestors: ["'none'"],
                imgSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"]
            }
        },
        hsts: config.nodeEnv === "production"
            ? { maxAge: 86400, includeSubDomains: false, preload: false }
            : false,
        referrerPolicy: { policy: "no-referrer" }
    }));
}

if (config.nodeEnv !== "production") {
    app.use(cors({
        origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/]
    }));
}

// Routes
app.get("/api/health", (req, res) => {
    const acceptingRequests = runtimeState.isAcceptingRequests();
    return res.status(acceptingRequests ? 200 : 503).json({
        status: acceptingRequests ? "ok" : "shutting_down",
        release: config.release,
        features: {
            ai: config.aiReviewEnabled,
            persistence: config.cvPersistenceEnabled
        },
        acceptingRequests
    });
});
if (config.nodeEnv === "production") {
    app.use("/api", rateLimit({
        windowMs: 60 * 1000,
        limit: Number.parseInt(process.env.CLIENT_RATE_LIMIT || "120", 10),
        standardHeaders: "draft-8",
        legacyHeaders: false
    }));
}
app.use("/api/export", exportRoutes);
app.use("/api/import", importRoutes);
if (config.cvPersistenceEnabled) {
    app.use("/api/cv", cvRoutes);
}
if (config.aiReviewEnabled) {
    app.use("/api/ai", aiRoutes);
}
app.use(handleBodyParserError);
app.use("/api", (req, res) => res.status(404).json({
    error: "not_found",
    message: "API route not found."
}));

const clientBuildPath = path.join(__dirname, "..", "client", "build");
if (config.nodeEnv === "production") {
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
    let server;
    const start = async () => {
        logRuntimeDiagnostics();
        await sweepAbandonedProfiles();
        if (config.cvPersistenceEnabled) {
            await connectDB();
        }

        server = app.listen(config.port, config.host, () => {
            console.log(`Server running on ${config.host}:${config.port}`);
        });
    };

    const shutdown = async (signal) => {
        if (!runtimeState.isAcceptingRequests()) {
            return;
        }
        runtimeState.beginShutdown();
        stopAcceptingExports();
        console.log(`Received ${signal}; shutting down.`);

        const hardStop = setTimeout(() => process.exit(1), config.shutdownDelayMs);
        hardStop.unref();

        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
        if (config.cvPersistenceEnabled) {
            await connectDB.mongoose.disconnect();
        }
        clearTimeout(hardStop);
        process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    start().catch((error) => {
        console.error("Server failed to start:", error.message);
        process.exit(1);
    });
}

module.exports = app;
