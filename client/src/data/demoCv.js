export const DEMO_CV_USER_ID = "demo_user";

export const getDemoCvData = () => ({
    userId: DEMO_CV_USER_ID,
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
    interests: "Running, independent cinema, specialty coffee, and mentoring early-career engineers.",
    sectionLayout: {
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
    }
});
