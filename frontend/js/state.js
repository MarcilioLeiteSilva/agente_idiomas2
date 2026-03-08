// web/js/state.js
const STORAGE_KEY = "agente_state";

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
        sessionId: "guest",
        userProfile: {
            native_language: "pt",
            target_language: "en",
            level: "Básico"
        },
        currentPage: null
    };
}

export const state = loadState();

export function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setSessionId(id) {
    state.sessionId = id;
    saveState();
}

export function setUserProfile(profile) {
    state.userProfile = { ...state.userProfile, ...profile };
    saveState();
}

export function clearState() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("access_token");
    window.location.href = "auth.html";
}
