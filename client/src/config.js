const parseBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    return String(value).trim().toLowerCase() === "true";
};

export const getApiBaseUrl = () =>
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:4000");
export const isAiReviewEnabled = () => parseBoolean(import.meta.env.VITE_AI_REVIEW_ENABLED);
export const isCvPersistenceEnabled = () => parseBoolean(import.meta.env.VITE_CV_PERSISTENCE_ENABLED);
export { parseBoolean };
