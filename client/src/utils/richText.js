import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "blockquote", "a", "span"
];

export const sanitizeRichHtml = (value = "") =>
    DOMPurify.sanitize(String(value || ""), {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
        ALLOW_DATA_ATTR: false,
        FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "svg", "math", "form", "base", "meta"],
        FORBID_ATTR: ["style"]
    });

export const extractRichText = (value = "") => {
    if (typeof window === "undefined" || typeof window.DOMParser === "undefined") {
        return String(value || "");
    }
    const parser = new window.DOMParser();
    const document = parser.parseFromString(`<div>${sanitizeRichHtml(value)}</div>`, "text/html");
    return String(document.body.textContent || "").replace(/\s+/g, " ").trim();
};
