import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import App, { mergeParsedCvData } from "./App";
import { consumeSse } from "./utils/aiStream";

jest.mock("./utils/aiStream", () => ({
    consumeSse: jest.fn()
}));

jest.mock("./components/CVForm", () => (props) => (
    <div>
        <div>Mock CV Form</div>
        <input
            aria-label="mock export filename"
            value={props.exportFileBaseName || ""}
            onChange={(event) => props.onExportFileBaseNameChange(event.target.value)}
        />
        <button type="button" onClick={() => props.onExport("pdf", props.exportFileBaseName)}>
            Mock Export PDF
        </button>
        <button type="button" onClick={() => props.setTemplate("B")}>
            Mock Set Template B
        </button>
        <button type="button" onClick={() => props.onOpenAIReview()}>
            Mock Open AI
        </button>
        <button type="button" onClick={() => props.onLoad("demo_user")}>
            Mock Load Demo
        </button>
        <button type="button" onClick={() => props.onOpenImport()}>
            Mock Import Existing CV
        </button>
        <span>{(props.exportFileSuggestions || []).join("|")}</span>
    </div>
));
jest.mock("./components/CVPreview", () => () => <div>Mock CV Preview</div>);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("App", () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);

        Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 1200 });
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            blob: async () => new Blob(["cv"], { type: "application/pdf" }),
            body: {},
            json: async () => ({})
        });
        window.URL.createObjectURL = jest.fn(() => "blob:mock");
        window.URL.revokeObjectURL = jest.fn();
        window.alert = jest.fn();
        consumeSse.mockReset();
        delete process.env.REACT_APP_AI_REVIEW_ENABLED;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        delete process.env.REACT_APP_AI_REVIEW_ENABLED;
    });

    it("keeps desktop preview panel visible in split layout", () => {
        window.innerWidth = 1280;

        act(() => {
            root.render(<App />);
        });

        expect(container.querySelector('[data-testid="preview-panel"]')).not.toBeNull();
    });

    it("mergeParsedCvData keeps existing values when parsed fields are empty", () => {
        const merged = mergeParsedCvData(
            {
                name: "Current Name",
                email: "current@example.com",
                summary: "Current summary",
                skills: ["Current Skill"],
                projects: ["<p>Current Project</p>"],
                sectionLayout: { left: ["personal"], right: ["summary"], editorCardOrder: [] }
            },
            {
                name: "Imported Name",
                email: "",
                summary: "",
                skills: [],
                projects: ["<p>Imported Project</p>"]
            }
        );

        expect(merged.name).toBe("Imported Name");
        expect(merged.email).toBe("current@example.com");
        expect(merged.summary).toBe("Current summary");
        expect(merged.skills).toEqual(["Current Skill"]);
        expect(merged.projects).toEqual(["<p>Imported Project</p>"]);
        expect(merged.sectionLayout).toEqual({ left: ["personal"], right: ["summary"], editorCardOrder: [] });
    });

    it("switches mobile bottom-nav between stack and preview views", () => {
        window.innerWidth = 800;

        act(() => {
            root.render(<App />);
        });

        expect(container.textContent).toContain("Mock CV Form");
        expect(container.textContent).not.toContain("Mock CV Preview");

        const previewNavBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Preview");
        act(() => {
            Simulate.click(previewNavBtn);
        });

        expect(container.textContent).toContain("Mock CV Preview");
        expect(container.textContent).not.toContain("Mock CV Form");
    });

    it("uses typed export filename for download", async () => {
        const anchor = { click: jest.fn(), set href(value) {}, get href() { return ""; }, download: "" };
        const originalCreateElement = document.createElement.bind(document);
        const createElementSpy = jest.spyOn(document, "createElement").mockImplementation((tag) => {
            if (tag === "a") {
                return anchor;
            }
            return originalCreateElement(tag);
        });

        act(() => {
            root.render(<App />);
        });

        const input = container.querySelector('input[aria-label="mock export filename"]');
        act(() => {
            Simulate.change(input, { target: { value: "Jane Doe CV?.pdf" } });
        });

        const exportBtn = Array.from(container.querySelectorAll("button")).find(
            (btn) => btn.textContent === "Mock Export PDF"
        );
        await act(async () => {
            Simulate.click(exportBtn);
        });

        expect(anchor.click).toHaveBeenCalled();
        expect(anchor.download).toBe("Jane_Doe_CV.pdf");
        createElementSpy.mockRestore();
    });

    it("updates filename suggestions when template changes", () => {
        act(() => {
            root.render(<App />);
        });

        expect(container.textContent).toContain("TemplateA");
        const templateBtn = Array.from(container.querySelectorAll("button")).find(
            (btn) => btn.textContent === "Mock Set Template B"
        );
        act(() => {
            Simulate.click(templateBtn);
        });

        expect(container.textContent).toContain("TemplateB");
    });

    it("loads bundled demo CV when demo_user cannot be fetched from the API", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "CV not found" })
        });

        act(() => {
            root.render(<App />);
        });

        const loadBtn = Array.from(container.querySelectorAll("button")).find(
            (btn) => btn.textContent === "Mock Load Demo"
        );
        await act(async () => {
            Simulate.click(loadBtn);
        });

        expect(window.alert).toHaveBeenCalledWith("Demo CV loaded!");
        expect(container.textContent).toContain("Maya_Patel_CV");
    });

    it("opens import modal, parses text, and shows detected review sections", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                cvData: {
                    name: "Imported Person",
                    summary: "Imported summary",
                    skills: ["React", "Node.js"],
                    projects: ["<p>Shelf Nudge</p>"],
                    workExperience: [],
                    volunteerExperience: [],
                    education: [],
                    certifications: [],
                    awards: [],
                    additionalInfo: ""
                },
                warnings: ["This import is a first draft. Please review the detected sections before exporting."]
            })
        });

        act(() => {
            root.render(<App />);
        });

        const importBtn = Array.from(container.querySelectorAll("button")).find(
            (btn) => btn.textContent === "Mock Import Existing CV"
        );
        act(() => {
            Simulate.click(importBtn);
        });

        expect(container.textContent).toContain("Import Existing CV");
        const textarea = container.querySelector('textarea[aria-label="Paste CV text"]');
        act(() => {
            Simulate.change(textarea, { target: { value: "Imported CV text" } });
        });

        const parseBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Parse CV");
        await act(async () => {
            Simulate.click(parseBtn);
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/api/import/cv-text"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({ text: "Imported CV text" })
            })
        );
        expect(container.textContent).toContain("Detected:");
        expect(container.textContent).toContain("✓ Summary");
        expect(container.textContent).toContain("✓ Skills");
        expect(container.textContent).toContain("Not detected:");
        expect(container.textContent).toContain("- Awards");
        expect(container.textContent).toContain("Import Detected Sections");
    });

    it("imports detected non-empty fields only after confirmation", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                cvData: {
                    name: "Imported Person",
                    summary: "Imported summary",
                    skills: ["React"],
                    projects: [],
                    workExperience: [],
                    volunteerExperience: [],
                    education: [],
                    certifications: [],
                    awards: [],
                    additionalInfo: ""
                },
                warnings: []
            })
        });

        act(() => {
            root.render(<App />);
        });

        act(() => {
            Simulate.click(
                Array.from(container.querySelectorAll("button")).find(
                    (btn) => btn.textContent === "Mock Import Existing CV"
                )
            );
        });
        act(() => {
            Simulate.change(container.querySelector('textarea[aria-label="Paste CV text"]'), {
                target: { value: "Imported CV text" }
            });
        });
        await act(async () => {
            Simulate.click(Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Parse CV"));
        });
        await act(async () => {
            Simulate.click(
                Array.from(container.querySelectorAll("button")).find(
                    (btn) => btn.textContent === "Import Detected Sections"
                )
            );
        });

        expect(container.textContent).toContain("Imported_Person_CV");
        expect(container.querySelector('[aria-label="Import existing CV"]')).toBeNull();
    });

    it("closes import modal without changing builder data when cancelled", async () => {
        act(() => {
            root.render(<App />);
        });
        const before = container.textContent;

        act(() => {
            Simulate.click(
                Array.from(container.querySelectorAll("button")).find(
                    (btn) => btn.textContent === "Mock Import Existing CV"
                )
            );
        });
        act(() => {
            Simulate.click(Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Cancel"));
        });

        expect(container.textContent).not.toContain("Paste plain CV text");
        expect(container.textContent).toContain("Mock CV Form");
        expect(container.textContent).toContain(before.match(/CV_TemplateA_[0-9-]+/)?.[0] || "TemplateA");
    });

    it("switches desktop right panel between preview and AI review when AI is enabled", () => {
        process.env.REACT_APP_AI_REVIEW_ENABLED = "true";
        window.innerWidth = 1280;

        act(() => {
            root.render(<App />);
        });

        const aiTab = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "AI Review");
        expect(aiTab).toBeTruthy();

        act(() => {
            Simulate.click(aiTab);
        });

        expect(container.querySelector('[aria-label="AI review panel"]')).not.toBeNull();
    });

    it("opens mobile AI review modal from bottom navigation center action", () => {
        process.env.REACT_APP_AI_REVIEW_ENABLED = "true";
        window.innerWidth = 800;

        act(() => {
            root.render(<App />);
        });

        const aiBtn = container.querySelector('button[aria-label="Open AI review"]');
        expect(aiBtn).not.toBeNull();
        act(() => {
            Simulate.click(aiBtn);
        });

        expect(container.querySelector('[aria-label="AI review modal"]')).not.toBeNull();
    });

    it("accumulates streamed AI suggestions and marks panel ready", async () => {
        process.env.REACT_APP_AI_REVIEW_ENABLED = "true";
        window.innerWidth = 1280;

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            body: {},
            json: async () => ({})
        });
        consumeSse.mockImplementation(async (_response, handlers) => {
            handlers.onEvent("start", { generatedAt: "2026-02-22T00:00:00.000Z" });
            handlers.onEvent("overall", {
                generatedAt: "2026-02-22T00:00:00.000Z",
                overall: { tier: "Strong", score: 84, summary: "Looks strong." },
                bySection: {}
            });
            handlers.onEvent("suggestion", {
                suggestion: {
                    id: "s1",
                    sectionId: "summary",
                    fieldPath: "summary",
                    issueType: "impact",
                    originalText: "Backend engineer",
                    suggestedText: "Senior backend engineer with measurable outcomes",
                    reason: "More impact",
                    title: "Strengthen opener"
                }
            });
            handlers.onEvent("complete", {});
        });

        act(() => {
            root.render(<App />);
        });

        const aiTab = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "AI Review");
        act(() => {
            Simulate.click(aiTab);
        });

        const runBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Run Review");
        await act(async () => {
            Simulate.click(runBtn);
        });

        expect(container.textContent).toContain("Strengthen opener");
        expect(container.textContent).toContain("Apply Change");
    });

    it("falls back to non-stream endpoint when SSE consumption fails", async () => {
        process.env.REACT_APP_AI_REVIEW_ENABLED = "true";
        window.innerWidth = 1280;

        global.fetch = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                body: {},
                json: async () => ({})
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    mode: "full",
                    generatedAt: "2026-02-22T00:00:00.000Z",
                    overall: { tier: "Strong", score: 80, summary: "Good base." },
                    bySection: {},
                    topFixes: [
                        {
                            id: "fallback_1",
                            sectionId: "summary",
                            fieldPath: "summary",
                            issueType: "impact",
                            originalText: "Backend engineer",
                            suggestedText: "Senior backend engineer",
                            reason: "Stronger positioning",
                            title: "Fallback suggestion"
                        }
                    ]
                })
            });

        consumeSse.mockRejectedValueOnce(new Error("stream boom"));

        act(() => {
            root.render(<App />);
        });

        const aiTab = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "AI Review");
        act(() => {
            Simulate.click(aiTab);
        });

        const runBtn = Array.from(container.querySelectorAll("button")).find((btn) => btn.textContent === "Run Review");
        await act(async () => {
            Simulate.click(runBtn);
        });

        expect(container.textContent).toContain("Fallback suggestion");
    });
});
