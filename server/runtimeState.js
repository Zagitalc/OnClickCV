let acceptingRequests = true;

const isAcceptingRequests = () => acceptingRequests;
const beginShutdown = () => {
    acceptingRequests = false;
};
const resetForTests = () => {
    acceptingRequests = true;
};

module.exports = {
    beginShutdown,
    isAcceptingRequests,
    resetForTests
};
