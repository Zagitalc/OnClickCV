const sanitizeHtml = require("sanitize-html");

const ALLOWED_TAGS = [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "span"
];

const ALLOWED_CLASSES = [
    /^ql-align-(center|right|justify)$/,
    /^ql-indent-[1-8]$/,
    /^ql-size-(small|large|huge)$/
];

const sanitizeRichText = (value = "") =>
    sanitizeHtml(String(value || ""), {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ["href", "target", "rel"],
            span: ["class"],
            p: ["class"],
            li: ["class"]
        },
        allowedClasses: {
            span: ALLOWED_CLASSES,
            p: ALLOWED_CLASSES,
            li: ALLOWED_CLASSES
        },
        allowedSchemes: ["http", "https", "mailto"],
        allowProtocolRelative: false,
        disallowedTagsMode: "discard",
        enforceHtmlBoundary: true,
        transformTags: {
            a: (tagName, attribs) => ({
                tagName,
                attribs: {
                    ...(attribs.href ? { href: attribs.href } : {}),
                    ...(attribs.target === "_blank"
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})
                }
            })
        },
        exclusiveFilter: (frame) => ["style", "script", "iframe", "object", "embed", "svg", "math", "form", "base", "meta"].includes(frame.tag)
    }).trim();

const extractText = (value = "") =>
    sanitizeHtml(String(value || ""), {
        allowedTags: [],
        allowedAttributes: {},
        textFilter: (text) => `${text.replace(/\u00a0/g, " ")} `
    })
        .replace(/\s+/g, " ")
        .trim();

module.exports = {
    ALLOWED_TAGS,
    extractText,
    sanitizeRichText
};
