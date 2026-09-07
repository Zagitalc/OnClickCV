module.exports = {
    roots: ["<rootDir>/src"],
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.[jt]sx?$": "babel-jest"
    },
    moduleNameMapper: {
        "^./config$": "<rootDir>/test/configMock.js",
        "\\.(css|less|scss|sass)$": "<rootDir>/test/styleMock.js"
    }
};
