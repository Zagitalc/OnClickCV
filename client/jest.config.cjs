module.exports = {
    roots: ["<rootDir>/src"],
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.[jt]sx?$": "babel-jest"
    },
    moduleNameMapper: {
        "\\.(css|less|scss|sass)$": "<rootDir>/test/styleMock.js"
    }
};
