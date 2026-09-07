const { execFileSync } = require("child_process");

const getChromiumVersion = () => {
    const executable = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
    try {
        return execFileSync(executable, ["--version"], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 5000
        }).trim();
    } catch (error) {
        return "Chromium unavailable";
    }
};

const logRuntimeDiagnostics = () => {
    const puppeteerVersion = require("puppeteer-core/package.json").version;
    console.log(`Runtime versions: Node ${process.version}; puppeteer-core ${puppeteerVersion}; ${getChromiumVersion()}`);
};

module.exports = {
    getChromiumVersion,
    logRuntimeDiagnostics
};

if (require.main === module) {
    logRuntimeDiagnostics();
}
