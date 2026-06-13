const { extractText } = require("./richText");

const stripHtml = (html) => extractText(typeof html === "string" ? html : "");

module.exports = {
    stripHtml
};
