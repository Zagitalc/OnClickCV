import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        plugins: [react()],
        server: {
            port: 3000,
            strictPort: true
        },
        preview: {
            port: 3000,
            strictPort: true
        },
        build: {
            outDir: "build"
        },
        define: {
            "process.env.REACT_APP_API_BASE_URL": JSON.stringify(
                env.REACT_APP_API_BASE_URL ?? env.VITE_API_BASE_URL ?? ""
            ),
            "process.env.REACT_APP_AI_REVIEW_ENABLED": JSON.stringify(
                env.REACT_APP_AI_REVIEW_ENABLED ?? env.VITE_AI_REVIEW_ENABLED ?? ""
            ),
            "process.env.NODE_ENV": JSON.stringify(mode)
        }
    };
});
