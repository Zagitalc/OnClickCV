const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DEMO_USER_ID = "demo_user";

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return;
    }

    fs.readFileSync(filePath, "utf8")
        .split(/\r?\n/)
        .forEach((line) => {
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

            if (key && process.env[key] === undefined) {
                process.env[key] = value;
            }
        });
};

loadEnvFile(path.join(__dirname, "..", ".env"));

const CV = require("../models/CV");
const { normalizeSectionLayout } = require("../utils/sectionLayout");

const getMongoUri = () =>
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/onclickcv";

const redactMongoUri = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:<redacted>@");

const demoCvData = {
    userId: DEMO_USER_ID,
    name: "Maya Patel",
    email: "maya.patel@example.com",
    phone: "+44 7700 900123",
    linkedin: "https://www.linkedin.com/in/maya-patel-product",
    summary:
        "Product-minded full-stack engineer with 6+ years building workflow tools, AI-assisted features, and customer-facing web applications. Strong record of taking ambiguous demo concepts from prototype to polished release.",
    workExperience: [
        "<p><strong>Senior Full-Stack Engineer - BrightForge Labs</strong><br/>London, UK | Mar 2022 - Present</p><ul><li>Led delivery of an AI-assisted customer onboarding workspace used by sales and success teams across 3 regions.</li><li>Reduced median task completion time by 34% by redesigning form flows, validation, and progress states.</li><li>Built React, Node.js, and MongoDB services supporting 40k+ monthly workflow submissions.</li></ul>",
        "<p><strong>Software Engineer - Northstar Digital</strong><br/>Manchester, UK | Jul 2019 - Feb 2022</p><ul><li>Implemented reporting dashboards and PDF export tooling for enterprise account managers.</li><li>Partnered with design and QA to introduce reusable UI components, cutting feature delivery time by 20%.</li><li>Improved API reliability by adding integration tests, request validation, and structured error responses.</li></ul>",
        "<p><strong>Junior Web Developer - Pixel Foundry</strong><br/>Leeds, UK | Sep 2017 - Jun 2019</p><ul><li>Built responsive marketing and application pages for startup and public-sector clients.</li><li>Maintained legacy JavaScript codebases while incrementally moving high-traffic views to React.</li></ul>"
    ],
    volunteerExperience: [
        "<p><strong>Mentor - Code First Girls</strong><br/>2023 - Present</p><ul><li>Coach early-career developers on project planning, portfolio building, and interview preparation.</li></ul>"
    ],
    education: [
        {
            degree: "MSc Human-Computer Interaction",
            school: "University of York",
            location: "York, UK",
            startDate: "2016",
            endDate: "2017",
            additionalInfo: "Dissertation focused on trust signals in AI-assisted productivity tools."
        },
        {
            degree: "BSc Computer Science",
            school: "University of Leeds",
            location: "Leeds, UK",
            startDate: "2013",
            endDate: "2016",
            additionalInfo: "First Class Honours."
        }
    ],
    skills: [
        "React",
        "Node.js",
        "Express",
        "MongoDB",
        "TypeScript",
        "JavaScript",
        "REST APIs",
        "AI product workflows",
        "PDF export",
        "Accessibility",
        "Jest",
        "Playwright"
    ],
    projects: [
        "<p><strong>CV Quality Assistant</strong> - Built a prototype reviewer that groups CV feedback by impact, clarity, ATS fit, and length, with one-click patch application.</p>",
        "<p><strong>Launch Metrics Console</strong> - Created a lightweight analytics dashboard for tracking activation, retention, and support signals after release.</p>"
    ],
    certifications: [
        "<p>MongoDB Associate Developer - 2024</p>",
        "<p>AWS Certified Cloud Practitioner - 2023</p>"
    ],
    awards: [
        "<p>BrightForge Engineering Impact Award - 2025</p>",
        "<p>Northstar Quarterly Customer Champion - 2021</p>"
    ],
    additionalInfo:
        "<p>Available for demo walkthroughs covering product engineering, AI-assisted workflows, and export-heavy web applications.</p>",
    interests: "Running, independent cinema, specialty coffee, and mentoring early-career engineers."
};

demoCvData.sectionLayout = normalizeSectionLayout(
    {
        left: ["personal", "skills", "certifications", "awards"],
        right: ["summary", "work", "projects", "education", "volunteer", "additional-info"],
        editorCardOrder: [
            "personal",
            "summary",
            "work",
            "projects",
            "skills",
            "education",
            "certifications",
            "awards",
            "volunteer",
            "additional-info",
            "ai-review",
            "template-export",
            "save-load"
        ]
    },
    demoCvData
);

const seedDemoCv = async () => {
    await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 5000 });

    const existing = await CV.findOne({ userId: DEMO_USER_ID });
    if (existing) {
        console.log(`Demo CV already exists for userId "${DEMO_USER_ID}".`);
        return;
    }

    const created = await CV.create({
        ...demoCvData,
        createdAt: new Date(),
        updatedAt: new Date()
    });

    console.log(`Created demo CV "${created.name}" for userId "${DEMO_USER_ID}".`);
};

seedDemoCv()
    .catch((error) => {
        console.error(`Failed to seed demo CV against ${redactMongoUri(getMongoUri())}.`);
        console.error("Check that MongoDB is running and that MONGODB_URI or MONGO_URI is correct.");
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
