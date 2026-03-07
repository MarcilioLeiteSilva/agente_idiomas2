// web/js/app.js
import { renderLayout, setActiveNav } from "./ui/layout.js";
import { state } from "./state.js";
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
    renderLayout();

    // Setup Nav Listeners
    document.querySelectorAll(".nav-item").forEach(el => {
        el.addEventListener("click", () => navigate(el.dataset.page));
    });

    // Default Page
    navigate("text");
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
