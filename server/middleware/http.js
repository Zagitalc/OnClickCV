const createJsonParser = (express, limit) =>
    express.json({
        limit,
        strict: true,
        type: ["application/json", "application/*+json"]
    });

const handleBodyParserError = (error, req, res, next) => {
    if (!error) {
        return next();
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            error: "request_too_large",
            message: "The request body exceeds the allowed size."
        });
    }

    if (error instanceof SyntaxError || error.type === "entity.parse.failed") {
        return res.status(400).json({
            error: "invalid_json",
            message: "The request body must contain valid JSON."
        });
    }

    return next(error);
};

module.exports = {
    createJsonParser,
    handleBodyParserError
};
