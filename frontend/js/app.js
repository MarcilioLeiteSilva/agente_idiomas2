import "preline";
import { renderLayout, setActiveNav } from "./ui/layout.js";
import { state, clearState, setUserProfile } from "./state.js";
import { apiCall } from "./api.js";
import * as PageDashboard from "./pages/dashboard.js";
import * as PageText from "./pages/text.js";
import * as PageAudio from "./pages/audio.js";
import * as PageInterp from "./pages/interpreter.js";
import * as PageLessons from "./pages/lessons.js";
import * as PageProgress from "./pages/progress.js";
import * as PageSettings from "./pages/settings.js";
import * as PageInterpAuto from "./pages/interpreter_auto.js";

import * as PageOnboarding from "./pages/onboarding.js";

// Título exibido no header para cada página
const PAGE_TITLES = {
    dashboard: "Dashboard",
    text: "Chat de Texto",
    audio: "Chat de Voz",
    lessons: "Trilhas de Estudo",
    interpreter: "Intérprete",
    interpreter_auto: "Intérprete Automático",
    progress: "Meu Progresso",
    settings: "Configurações",
    onboarding: "Configuração Inicial",
};

const PAGES = {
    dashboard: PageDashboard,
    text: PageText,
    audio: PageAudio,
    interpreter: PageInterp,
    interpreter_auto: PageInterpAuto,
    lessons: PageLessons,
    progress: PageProgress,
    settings: PageSettings,
    onboarding: PageOnboarding
};

let activePageModule = null;

async function init() {
    // Auth Guard
    const token = localStorage.getItem("access_token");
    if (!token) {
        window.location.href = "auth.html";
        return;
    }

    renderLayout();

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

    // Load Profile & Initial Routing
    try {
        const email = localStorage.getItem("user_email") || state.sessionId;
        const profile = await apiCall(`/v1/profile?user_id=${email}`);

        if (profile && !profile.error) {
            setUserProfile(profile);
            // Update User Name in Sidebar
            const userDisplay = document.getElementById("userNameDisplay");
            if (userDisplay) {
                userDisplay.innerText = profile.full_name || email.split("@")[0];
            }
            navigate("dashboard");
        } else {
            console.log("Profile missing, redirecting to onboarding");
            navigate("onboarding");
        }
    } catch (e) {
        console.warn("Profile not found or error, showing onboarding:", e);
        navigate("onboarding");
    }
}

export function navigate(pageId) {
    if (!PAGES[pageId]) return;

    // Cleanup old page
    if (activePageModule && activePageModule.unmount) {
        activePageModule.unmount();
    }

    // Update UI — título e nav ativo
    setActiveNav(pageId);
    state.currentPage = pageId;

    // Atualiza título da seção no header
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) titleEl.textContent = PAGE_TITLES[pageId] || pageId;

    // Mount new page
    const main = document.getElementById("mainContent");
    main.innerHTML = ""; // Hard clear
    activePageModule = PAGES[pageId];
    if (activePageModule && activePageModule.mount) {
        Promise.resolve(activePageModule.mount(main)).then(() => {
            if (window.HSStaticMethods) {
                window.HSStaticMethods.autoInit();
                console.log("Preline autoInit invoked for", pageId);
            }
        }).catch(err => {
            console.error("Mount error:", err);
            if (window.HSStaticMethods) window.HSStaticMethods.autoInit();
        });
    }
}

// Start
document.addEventListener("DOMContentLoaded", init);
