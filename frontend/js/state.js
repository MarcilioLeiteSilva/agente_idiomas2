// web/js/state.js
export const state = {
    sessionId: "user1", // Default, overwritten by load/settings
    userProfile: {
        native_language: "pt",
        target_language: "en",
        level: "A1"
    },
    currentPage: null
};

export function setSessionId(id) {
    state.sessionId = id;
}

export function setUserProfile(profile) {
    state.userProfile = { ...state.userProfile, ...profile };
}
