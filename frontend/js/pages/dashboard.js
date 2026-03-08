// js/pages/dashboard.js
import { apiCall } from "../api.js";
import { state } from "../state.js";

let container = null;

export async function mount(parent) {
    container = document.createElement("div");
    container.className = "space-y-6";
    parent.appendChild(container);

    // Skeleton enquanto carrega
    container.innerHTML = `
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            ${Array(4).fill(`
                <div class="h-24 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
            `).join("")}
        </div>
    `;

    try {
        const [stats, progress] = await Promise.all([
            apiCall(`/v1/stats?user_id=${state.sessionId}`).catch(() => ({})),
            apiCall(`/v1/progress?user_id=${state.sessionId}`).catch(() => [])
        ]);

        let preetchedLastItem = null;
        if (Array.isArray(progress) && progress.length > 0) {
            preetchedLastItem = [...progress].sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))[0];
            if (preetchedLastItem && preetchedLastItem.lesson_id) {
                try {
                    const info = await apiCall(`/v1/lesson/info?target_language=${preetchedLastItem.target_language || 'en'}&lesson_id=${preetchedLastItem.lesson_id}`);
                    preetchedLastItem.lesson_title = info.title;
                } catch (e) { }
            }
        }

        render(stats, progress, preetchedLastItem);
    } catch (e) {
        render({}, [], null);
    }
}

export function unmount() {
    if (container) container.remove();
}

function render(stats, progress, preetchedLastItem = null) {
    container.innerHTML = "";

    const profile = state.userProfile || {};
    const email = localStorage.getItem("user_email") || state.sessionId || "";
    // Aqui usamos o full_name ou o user_name do localStorage (definido no auth.html)
    const name = profile.full_name || localStorage.getItem("user_name") || email.split("@")[0] || "Estudante";
    const level = profile.level || "A1";
    const nativeLang = langLabel(profile.native_language || "pt");
    const targetLang = langLabel(profile.target_language || "en");

    const completed = Array.isArray(progress)
        ? progress.filter(p => p.status === "completed")
        : [];
    const incomplete = Array.isArray(progress)
        ? progress.filter(p => p.status !== "completed")
        : [];
    const avg = completed.length
        ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length)
        : 0;

    // Última atividade
    const lastItem = preetchedLastItem || (Array.isArray(progress) && progress.length > 0
        ? [...progress].sort((a, b) => (b.started_at || "").localeCompare(a.started_at || ""))[0]
        : null);

    // ── Saudação ──────────────────────────────────────────────────────────────
    const hourNow = new Date().getHours();
    const greeting = hourNow < 12 ? "Bom dia" : hourNow < 18 ? "Boa tarde" : "Boa noite";

    const greetDiv = document.createElement("div");
    greetDiv.className = "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3";
    greetDiv.innerHTML = `
        <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">${greeting},</p>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white capitalize">${name} 👋</h2>
            <p class="text-sm text-gray-400 mt-0.5">
                Estudando <strong class="text-gray-600 dark:text-gray-300">${targetLang}</strong>
                &middot; Nível <strong class="text-gray-600 dark:text-gray-300">${level}</strong>
            </p>
        </div>
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                ${targetLang}
            </span>
        </div>
    `;
    container.appendChild(greetDiv);

    // ── Cards de Stats ─────────────────────────────────────────────────────────
    const statsData = [
        {
            label: "XP Total",
            value: stats.xp ?? 0,
            suffix: " xp",
            icon: `<svg class="w-5 h-5 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/></svg>`,
            bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
            label: "Ofensiva",
            value: stats.streak_days ?? 0,
            suffix: " dias",
            icon: `<svg class="w-5 h-5 text-red-500 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"/></svg>`,
            bg: "bg-red-50 dark:bg-red-900/20",
        },
        {
            label: "Lições Concluídas",
            value: completed.length,
            suffix: "",
            icon: `<svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"/></svg>`,
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
            label: "Média de Pontuação",
            value: avg,
            suffix: "/100",
            icon: `<svg class="w-5 h-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"/></svg>`,
            bg: "bg-blue-50 dark:bg-blue-900/20",
        },
    ];

    const grid = document.createElement("div");
    grid.className = "grid sm:grid-cols-2 lg:grid-cols-4 gap-4";
    statsData.forEach(s => {
        const card = document.createElement("div");
        card.className = "flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm dark:bg-slate-900 dark:border-gray-700 hover:shadow-md transition-shadow";
        card.innerHTML = `
            <div class="p-5 flex items-center gap-4">
                <div class="flex-shrink-0 w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center">
                    ${s.icon}
                </div>
                <div>
                    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">${s.label}</p>
                    <p class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                        ${s.value}<span class="text-sm font-normal text-gray-400">${s.suffix}</span>
                    </p>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    container.appendChild(grid);

    // ── Linha de detalhes ──────────────────────────────────────────────────────
    const detailGrid = document.createElement("div");
    detailGrid.className = "grid lg:grid-cols-2 gap-5";

    // Card: Perfil do Aluno
    const profileCard = document.createElement("div");
    profileCard.className = "bg-white border border-gray-200 rounded-2xl p-6 dark:bg-slate-900 dark:border-gray-700";
    profileCard.innerHTML = `
        <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4">Perfil do Aluno</h3>
        <ul class="space-y-3">
            ${infoRow("Idioma Nativo", nativeLang, "🌍")}
            ${infoRow("Idioma Alvo", targetLang, "🎯")}
            ${infoRow("Nível Atual", level, "📊")}
            ${infoRow("Meta de XP/dia", `${stats.daily_goal_xp ?? 50} xp`, "⚡")}
            ${infoRow("XP hoje", `${stats.daily_xp ?? 0} xp`, "🔥")}
        </ul>
    `;
    detailGrid.appendChild(profileCard);

    // Card: Última Atividade / Acesso Rápido
    const activityCard = document.createElement("div");
    activityCard.className = "bg-white border border-gray-200 rounded-2xl p-6 dark:bg-slate-900 dark:border-gray-700 flex flex-col gap-4";

    if (lastItem) {
        const date = lastItem.started_at
            ? new Date(lastItem.started_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
            : "—";
        const isOk = lastItem.status === "completed";
        activityCard.innerHTML = `
            <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Última Atividade</h3>
            <div class="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl flex-shrink-0">📚</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">${lastItem.lesson_title || lastItem.lesson_id}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${date}</p>
                </div>
                <span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${isOk
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }">
                    ${isOk ? `✓ ${lastItem.score}` : "Incompleta"}
                </span>
            </div>
            <p class="text-xs text-gray-400 text-center">
                ${completed.length} concluída${completed.length !== 1 ? "s" : ""} &middot; ${incomplete.length} em andamento
            </p>
        `;
    } else {
        activityCard.innerHTML = `
            <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Bem-vindo!</h3>
            <div class="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl">🚀</div>
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Nenhuma atividade ainda</p>
                <p class="text-xs text-gray-400">Comece sua primeira lição em <strong>Trilhas de Estudo</strong>!</p>
            </div>
        `;
    }
    detailGrid.appendChild(activityCard);
    container.appendChild(detailGrid);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function infoRow(label, value, icon) {
    return `
        <li class="flex items-center justify-between gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>${icon}</span> ${label}
            </span>
            <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${value}</span>
        </li>
    `;
}

function langLabel(code) {
    const map = {
        en: "Inglês", pt: "Português", fr: "Francês",
        es: "Espanhol", de: "Alemão", it: "Italiano",
        ja: "Japonês", zh: "Chinês"
    };
    return map[code?.toLowerCase()] || code || "—";
}
