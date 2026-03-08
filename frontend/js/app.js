// web/js/app.js
import { renderLayout, setActiveNav } from "./ui/layout.js";
import { state, clearState } from "./state.js";
import * as PageText from "./pages/text.js";
import * as PageAudio from "./pages/audio.js";
import * as PageInterp from "./pages/interpreter.js";
import * as PageLessons from "./pages/lessons.js";
import * as PageProgress from "./pages/progress.js";
import * as PageSettings from "./pages/settings.js";
import * as PageInterpAuto from "./pages/interpreter_auto.js";

const PAGES = {
    text: PageText,
    audio: PageAudio,
    interpreter: PageInterp,
    interpreter_auto: PageInterpAuto,
    lessons: PageLessons,
    progress: PageProgress,
    settings: PageSettings
};

let activePageModule = null;

function init() {
    // Auth Guard
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    renderLayout();

    // Update User Name in Sidebar
    const userDisplay = document.getElementById("userNameDisplay");
    if (userDisplay && state.sessionId) {
        userDisplay.innerText = state.sessionId.split("@")[0]; // Simple display logic
    }

    // Setup Nav Listeners
    document.querySelectorAll(".nav-item[data-page]").forEach(el => {
        el.addEventListener("click", () => navigate(el.dataset.page));
    });

    // Setup Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            if (confirm("Deseja mesmo sair?")) {
                clearState();
            }
        };
    }

    // Default Page
    navigate("lessons"); // Start in lessons after login
}

function navigate(pageId) {
    if (!PAGES[pageId]) return;

    // Cleanup old page
    if (activePageModule && activePageModule.unmount) {
        activePageModule.unmount();
    }

    // Update UI
    setActiveNav(pageId);
    state.currentPage = pageId;

    // Mount new page
    const main = document.getElementById("mainContent");
    main.innerHTML = ""; // Hard clear
    activePageModule = PAGES[pageId];
    if (activePageModule && activePageModule.mount) {
        activePageModule.mount(main);
    }
}

// Start
document.addEventListener("DOMContentLoaded", init);
