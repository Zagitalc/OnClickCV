const parseBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return String(value).trim().toLowerCase() === "true";
};

module.exports = {
    getApiBaseUrl: () => "",
    isAiReviewEnabled: () => parseBoolean(process.env.VITE_AI_REVIEW_ENABLED),
    isCvPersistenceEnabled: () => parseBoolean(
        process.env.VITE_CV_PERSISTENCE_ENABLED,
        true
    ),
    parseBoolean
};
