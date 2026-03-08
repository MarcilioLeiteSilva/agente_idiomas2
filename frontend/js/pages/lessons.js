// web/js/pages/lessons.js
import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let currentLessonId = null;

// ─── TTS ─────────────────────────────────────────────────────────────────────

// Mapa idioma -> locale BCP-47
const LANG_LOCALE = {
    en: "en-US", fr: "fr-FR", es: "es-ES",
    de: "de-DE", it: "it-IT", pt: "pt-BR",
    ja: "ja-JP", zh: "zh-CN"
};

function getLessonLang() {
    const tl = state.userProfile?.target_language || "en";
    return LANG_LOCALE[tl.toLowerCase()] || "en-US";
}

function speakText(text, lang) {
    if (!window.speechSynthesis) return;
    // Limpar fila para não sobrepor
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang || getLessonLang();
    utt.rate = 0.92;
    utt.pitch = 1;
    window.speechSynthesis.speak(utt);
}

/**
 * Cria o botão de áudio SVG (volume-2).
 * @param {string} text  - texto a ser lido
 * @param {string} [variant] - 'dark' para fundo colorido (msg do bot) | 'light' para card claro
 */
function createAudioBtn(text, variant = "dark") {
    const btn = document.createElement("button");
    btn.title = "Ouvir";
    btn.type = "button";

    const baseClass = "flex-shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-full transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-blue-400";
    const darkClass = "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-800";
    const lightClass = "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-400 dark:hover:bg-slate-600";

    btn.className = `${baseClass} ${variant === "dark" ? darkClass : lightClass}`;
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
        </svg>
    `;

    // Estado de reprodução (animar enquanto fala)
    btn.onclick = () => {
        speakText(text);
        btn.classList.add("animate-pulse");
        // Remove animação ao terminar (~duração estimada)
        const dur = Math.max(1000, text.length * 60);
        setTimeout(() => btn.classList.remove("animate-pulse"), dur);
    };

    return btn;
}

// Ícones temáticos por título/objetivo da lição
const LESSON_ICONS = [
    { keywords: ["greeting", "introduction", "hello", "cumprimento"], icon: "👋" },
    { keywords: ["number", "age", "count", "número"], icon: "🔢" },
    { keywords: ["food", "restaurant", "order", "comida"], icon: "🍽️" },
    { keywords: ["direction", "map", "street", "direção"], icon: "🗺️" },
    { keywords: ["routine", "daily", "schedule", "rotina"], icon: "⏰" },
    { keywords: ["travel", "trip", "airport", "viagem"], icon: "✈️" },
    { keywords: ["family", "home", "house", "família"], icon: "🏠" },
    { keywords: ["work", "job", "office", "trabalho"], icon: "💼" },
    { keywords: ["shopping", "store", "buy", "compras"], icon: "🛍️" },
    { keywords: ["weather", "climate", "tempo", "clima"], icon: "🌤️" },
];

function getLessonIcon(lesson) {
    const text = `${lesson.title} ${lesson.objective}`.toLowerCase();
    for (const { keywords, icon } of LESSON_ICONS) {
        if (keywords.some(k => text.includes(k))) return icon;
    }
    return "📚";
}

// Cores por nível
const LEVEL_COLORS = {
    A1: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
    A2: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800",
    B1: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    B2: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800",
    C1: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
    C2: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800",
};

function getLevelClasses(level) {
    return LEVEL_COLORS[level?.toUpperCase()] || LEVEL_COLORS["A1"];
}

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-lessons";
    parent.appendChild(container);
    loadCatalog();
}

export function unmount() {
    if (container) container.remove();
}

// ─── CATÁLOGO ────────────────────────────────────────────────────────────────

async function loadCatalog() {
    container.innerHTML = `
        <div class="flex items-center justify-center py-16">
            <div class="flex flex-col items-center gap-3">
                <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Carregando trilhas...</p>
            </div>
        </div>
    `;
    try {
        const [list, rec] = await Promise.all([
            apiCall(`/v1/lessons?user_id=${state.sessionId}`),
            apiCall(`/v1/recommendations?user_id=${state.sessionId}`)
        ]);
        renderCatalog(list, rec);
    } catch (e) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
                    <svg class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/></svg>
                </div>
                <div class="text-center">
                    <p class="font-semibold text-gray-800 dark:text-gray-200">Erro ao carregar</p>
                    <p class="text-sm text-gray-500 mt-1">${e.message}</p>
                </div>
                <button onclick="window.location.reload()" class="py-2 px-5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all">
                    Tentar novamente
                </button>
            </div>
        `;
    }
}

function renderCatalog(data, rec) {
    container.innerHTML = "";

    // ── Cabeçalho da seção ──────────────────────────────────────────────────
    const header = document.createElement("div");
    header.className = "mb-8";
    header.innerHTML = `
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Trilhas de Aprendizado</h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Lições estruturadas para evoluir no seu ritmo.</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                <span id="lessonCountBadge">—</span>
            </div>
        </div>
    `;
    container.appendChild(header);

    // ── Recomendação ────────────────────────────────────────────────────────
    if (rec?.recommended_lesson) {
        const r = rec.recommended_lesson;
        const r_id = r.lesson_id || r.id || r.filename;
        const icon = getLessonIcon(r);

        const recDiv = document.createElement("div");
        recDiv.className = "mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 shadow-xl shadow-blue-500/20";
        recDiv.innerHTML = `
            <!-- Decoração de fundo -->
            <div class="absolute inset-0 pointer-events-none overflow-hidden">
                <div class="absolute -top-8 -right-8 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
                <div class="absolute -bottom-12 -left-6 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl"></div>
            </div>

            <div class="relative z-10 p-6 sm:p-8">
                <div class="flex flex-col sm:flex-row sm:items-center gap-6">
                    <!-- Ícone + Info -->
                    <div class="flex items-start gap-5 flex-1 min-w-0">
                        <div class="flex-shrink-0 w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                            ${icon}
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-200 bg-white/10 rounded-full px-3 py-1 mb-2">
                                <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd"/></svg>
                                Recomendado para você
                            </div>
                            <h3 class="text-xl sm:text-2xl font-bold text-white mb-1 truncate">${r.title}</h3>
                            <p class="text-blue-100 text-sm line-clamp-2">${r.objective}</p>
                            ${rec.reason ? `
                            <div class="flex items-center gap-1.5 mt-3 text-xs text-blue-200/80">
                                <svg class="w-3.5 h-3.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
                                <span>${rec.reason}</span>
                            </div>` : ""}
                        </div>
                    </div>
                    <!-- Botão -->
                    <button id="btnStartRec" class="flex-shrink-0 group flex items-center gap-2 bg-white text-blue-700 font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all duration-200 w-full sm:w-auto justify-center">
                        Começar Agora
                        <svg class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>
                    </button>
                </div>
            </div>
        `;
        recDiv.querySelector("#btnStartRec").onclick = () => startLesson(r_id);
        container.appendChild(recDiv);
    }

    // ── Grid de lições ──────────────────────────────────────────────────────
    const grid = document.createElement("div");
    grid.className = "grid sm:grid-cols-2 xl:grid-cols-3 gap-5";

    let list = [];
    if (Array.isArray(data)) list = data;
    else if (data?.lessons) list = data.lessons;

    // Atualiza contador
    const countEl = container.querySelector("#lessonCountBadge");
    if (countEl) countEl.textContent = `${list.length} lição${list.length !== 1 ? "ões" : ""}`;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center bg-white border-2 border-dashed border-gray-200 rounded-2xl dark:bg-slate-800/50 dark:border-gray-700 gap-3">
                <div class="w-14 h-14 bg-gray-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-2xl">📭</div>
                <div class="text-center">
                    <p class="font-semibold text-gray-700 dark:text-gray-300">Nenhuma lição disponível</p>
                    <p class="text-sm text-gray-400 mt-1">Tente ajustar seu idioma ou nível nas configurações.</p>
                </div>
            </div>
        `;
    } else {
        list.forEach((l, index) => {
            const id = l.lesson_id || l.id || l.filename;
            const icon = getLessonIcon(l);
            const levelClasses = getLevelClasses(l.level || "A1");
            const steps = l.script_steps?.length || 0;
            const vocab = l.target_vocab?.length || 0;

            const card = document.createElement("div");
            card.className = "group relative flex flex-col bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 dark:bg-slate-900 dark:border-gray-700 dark:hover:border-blue-700 overflow-hidden";
            card.style.animationDelay = `${index * 60}ms`;

            card.innerHTML = `
                <!-- Barra de acento no topo -->
                <div class="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 w-0 group-hover:w-full transition-all duration-500 rounded-t-2xl"></div>

                <div class="p-5 flex flex-col h-full">
                    <!-- Header do card -->
                    <div class="flex items-start justify-between mb-4">
                        <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                            ${icon}
                        </div>
                        <span class="inline-flex items-center border text-xs font-bold px-2 py-1 rounded-lg ${levelClasses}">
                            ${l.level || "A1"}
                        </span>
                    </div>

                    <!-- Título e objetivo -->
                    <h4 class="text-base font-bold text-gray-900 dark:text-white mb-1.5 leading-snug">${l.title}</h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-grow line-clamp-2 leading-relaxed">
                        ${l.objective}
                    </p>

                    <!-- Metadados -->
                    <div class="flex items-center gap-3 mb-4 text-xs text-gray-400 dark:text-gray-500">
                        ${steps > 0 ? `
                        <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
                            ${steps} passos
                        </span>` : ""}
                        ${vocab > 0 ? `
                        <span class="flex items-center gap-1">
                            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>
                            ${vocab} palavras
                        </span>` : ""}
                    </div>

                    <!-- Vocabs preview -->
                    ${l.target_vocab?.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${l.target_vocab.slice(0, 4).map(v => `
                            <span class="text-[11px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md">${v}</span>
                        `).join("")}
                        ${l.target_vocab.length > 4 ? `<span class="text-[11px] text-gray-400">+${l.target_vocab.length - 4}</span>` : ""}
                    </div>` : ""}

                    <!-- Botão de iniciar -->
                    <button id="btnStart-${id}" class="mt-auto w-full py-2.5 px-4 inline-flex justify-center items-center gap-2 text-sm font-semibold rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 active:scale-[0.98] dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white dark:hover:border-blue-600">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"/></svg>
                        Praticar Lição
                    </button>
                </div>
            `;
            grid.appendChild(card);
            card.querySelector(`#btnStart-${id}`).onclick = () => startLesson(id);
        });
    }

    container.appendChild(grid);
}

// ─── LIÇÃO ATIVA ─────────────────────────────────────────────────────────────

function renderActiveLesson(data) {
    const steps = data.lesson?.script_steps || [];
    const totalSteps = steps.length;

    container.innerHTML = `
        <div class="flex flex-col h-full min-h-[calc(100vh-12rem)] gap-0">

            <!-- Header da lição ativa -->
            <div class="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-t-2xl dark:bg-slate-900 dark:border-gray-700 shadow-sm">
                <div class="flex items-center gap-3">
                    <button id="btnLessonExit" class="w-9 h-9 inline-flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-300 transition-all" title="Sair da lição">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
                    </button>
                    <div>
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm leading-tight">${data.lesson.title}</h3>
                        <p class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] sm:max-w-sm">${data.lesson.objective}</p>
                    </div>
                </div>

                <!-- Progresso e passo -->
                <div class="flex items-center gap-3">
                    <div class="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                        <div class="w-24 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div id="lessonProgressBar" class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500" style="width: ${totalSteps > 0 ? Math.round(1 / totalSteps * 100) : 100}%"></div>
                        </div>
                        <span id="stepBadge" class="font-medium text-gray-500 dark:text-gray-400">1 / ${totalSteps}</span>
                    </div>
                    <!-- Mobile: só o badge -->
                    <span id="stepBadgeMobile" class="sm:hidden inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">P. 1</span>
                </div>
            </div>

            <!-- Barra de progresso visual (full width) -->
            <div class="h-0.5 bg-gray-100 dark:bg-slate-800">
                <div id="lessonProgressBarFull" class="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out" style="width:${totalSteps > 0 ? Math.round(1 / totalSteps * 100) : 100}%"></div>
            </div>

            <!-- Área do Chat -->
            <div id="lessonChat" class="flex-1 overflow-y-auto flex flex-col gap-4 p-5 bg-slate-50/80 dark:bg-slate-800/30 min-h-[300px] max-h-[calc(100vh-24rem)]"></div>

            <!-- Área de Input -->
            <div class="bg-white border border-t-0 border-gray-200 rounded-b-2xl p-4 dark:bg-slate-900 dark:border-gray-700 shadow-sm">
                <!-- Dica de objetivo -->
                <div class="mb-3 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <svg class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"/></svg>
                    <p id="currentStepHint" class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">${data.first_step}</p>
                </div>

                <!-- Input + Botões -->
                <div class="flex items-center gap-2">
                    <input
                        id="lessonInput"
                        type="text"
                        placeholder="Responda em ${state.userProfile?.target_language?.toUpperCase() || 'EN'}..."
                        autocomplete="off"
                        class="flex-1 py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
                    />
                    <button id="lessonSend" class="flex-shrink-0 w-11 h-11 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/30">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>
                    </button>
                    <button id="lessonFinish" class="hidden flex-shrink-0 h-11 inline-flex items-center gap-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all active:scale-95">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
                        Concluir
                    </button>
                </div>
            </div>
        </div>
    `;

    // Event Listeners
    document.getElementById("btnLessonExit").onclick = stopLesson;
    document.getElementById("lessonSend").onclick = sendInput;
    document.getElementById("lessonFinish").onclick = completeLesson;
    document.getElementById("lessonInput").onkeydown = (e) => { if (e.key === "Enter") sendInput(); };

    // Primeira mensagem do tutor + auto-leitura
    appendMsg("Tutor", data.first_step, "bot");
    speakText(data.first_step);
}

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────

function renderFeedback(fb) {
    const score = fb.overall_score ?? 0;
    const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-600" : "text-red-500";
    const scoreBg = score >= 80 ? "bg-emerald-50 dark:bg-emerald-900/20" : score >= 60 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-red-50 dark:bg-red-900/20";

    const html = `
        <div class="w-full max-w-lg mx-auto my-2 ${scoreBg} border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden">
            <!-- Header do feedback -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                <div class="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                    Avaliação
                </div>
                <span class="text-2xl font-black ${scoreColor}">${score}<span class="text-sm font-medium opacity-60">/100</span></span>
            </div>
            <!-- Scores por categoria -->
            <div class="grid grid-cols-3 divide-x divide-gray-200/50 dark:divide-gray-700/50 text-center py-3">
                ${[
            ["Gramática", fb.grammar_score],
            ["Vocabulário", fb.vocabulary_score],
            ["Fluência", fb.fluency_score]
        ].map(([label, val]) => `
                    <div class="px-3">
                        <div class="text-lg font-bold text-gray-800 dark:text-gray-200">${val ?? "—"}<span class="text-xs font-normal opacity-50">/10</span></div>
                        <div class="text-[11px] text-gray-400 mt-0.5">${label}</div>
                    </div>
                `).join("")}
            </div>
            <!-- Texto do feedback -->
            ${fb.feedback_text ? `
            <div class="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50">
                <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">${fb.feedback_text}</p>
            </div>` : ""}
            <!-- Correções -->
            ${fb.corrections?.length ? `
            <div class="px-4 pb-4 border-t border-gray-200/50 dark:border-gray-700/50 pt-3" id="fbCorrections">
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Correções</p>
                <ul class="space-y-2" id="fbCorrectionsList">
                    ${fb.corrections.map((c, i) => `
                        <li class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span class="text-amber-500 mt-0.5 flex-shrink-0">→</span>
                            <span class="flex-1">${c}</span>
                            <span class="fb-audio-slot" data-correction="${i}"></span>
                        </li>
                    `).join("")}
                </ul>
            </div>` : ""}
        </div>
    `;

    appendMsg("Avaliação", "", "fb", html);
    showToast(`Pontuação: ${score}/100`, score >= 75 ? "success" : "info");

    // Injetar botões de áudio nas correções (após o innerHTML ser inserido no DOM)
    if (fb.corrections?.length) {
        // Aguarda o próximo frame para garantir que o DOM foi inserido
        requestAnimationFrame(() => {
            document.querySelectorAll(".fb-audio-slot").forEach(slot => {
                const idx = parseInt(slot.dataset.correction, 10);
                const correction = fb.corrections[idx];
                if (correction) {
                    slot.appendChild(createAudioBtn(correction, "light"));
                }
            });
        });
    }
}

// ─── AÇÕES ────────────────────────────────────────────────────────────────────

async function startLesson(id) {
    // Loading state no botão
    const btn = document.getElementById(`btnStart-${id}`) || document.getElementById("btnStartRec");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Iniciando...`;
    }

    try {
        const res = await apiCall("/v1/lesson/start", "POST", { user_id: state.sessionId, lesson_id: id });
        if (res.error) throw new Error(res.error);
        currentLessonId = id;
        renderActiveLesson(res);
    } catch (e) {
        showToast("Erro ao iniciar lição: " + e.message, "err");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"/></svg> Praticar Lição`;
        }
    }
}

async function sendInput() {
    const input = document.getElementById("lessonInput");
    const sendBtn = document.getElementById("lessonSend");
    const val = input.value.trim();
    if (!val) return;

    appendMsg("Você", val, "me");
    input.value = "";
    input.focus();

    // Loading no botão de enviar
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>`;

    try {
        const res = await apiCall("/v1/lesson/next", "POST", { user_id: state.sessionId, user_input: val });
        if (res.error) throw new Error(res.error);

        if (res.feedback) {
            renderFeedback(res.feedback);
        }

        if (res.status === "finished") {
            appendMsg("Tutor", "Excelente! Você completou todos os exercícios. Clique em **Concluir** para salvar seu progresso e ganhar XP! 🎉", "bot");
            document.getElementById("lessonSend")?.classList.add("hidden");
            document.getElementById("lessonFinish")?.classList.remove("hidden");
            // Barra de progresso 100%
            const pb = document.getElementById("lessonProgressBarFull");
            if (pb) pb.style.width = "100%";
        } else {
            appendMsg("Tutor", res.instruction, "bot");
            speakText(res.instruction);

            // Atualizar hint e progresso
            const hint = document.getElementById("currentStepHint");
            if (hint) hint.textContent = res.instruction;

            const stepBadge = document.getElementById("stepBadge");
            const stepBadgeMobile = document.getElementById("stepBadgeMobile");
            const progressFull = document.getElementById("lessonProgressBarFull");

            // Calcular total de steps a partir do estado
            if (res.step_index !== undefined) {
                const step = res.step_index + 1;
                if (stepBadge) stepBadge.textContent = `${step} / ?`;
                if (stepBadgeMobile) stepBadgeMobile.textContent = `P. ${step}`;
            }
        }
    } catch (e) {
        showToast("Erro: " + e.message, "err");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>`;
    }
}

function appendMsg(role, text, cls, html = null) {
    const chat = document.getElementById("lessonChat");
    if (!chat) return;

    const wrapper = document.createElement("div");

    if (html) {
        // Feedback card — sem bubble
        wrapper.innerHTML = html;
    } else {
        const isMe = cls === "me";
        const isBot = cls === "bot";

        wrapper.className = `flex ${isMe ? "justify-end" : "justify-start"} gap-2.5`;

        // Bubble container
        const bubble = document.createElement("div");
        bubble.className = `max-w-[75%] ${isMe
                ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm shadow-blue-500/20"
                : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm"
            } px-4 py-3`;

        // Texto formatado
        const p = document.createElement("p");
        p.className = "text-sm leading-relaxed";
        p.innerHTML = text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br>");
        bubble.appendChild(p);

        // Botão de áudio apenas nas msgs do tutor (bot), sempre visível
        if (isBot) {
            const audioRow = document.createElement("div");
            audioRow.className = "flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700";

            const label = document.createElement("span");
            label.className = "text-[11px] text-gray-400 dark:text-gray-500 select-none";
            label.textContent = "Ouvir";

            audioRow.appendChild(label);
            audioRow.appendChild(createAudioBtn(text));
            bubble.appendChild(audioRow);
        }

        if (isBot) {
            const avatar = document.createElement("div");
            avatar.className = "flex-shrink-0 w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm mt-1";
            avatar.textContent = "🤖";
            wrapper.appendChild(avatar);
        }

        wrapper.appendChild(bubble);
    }

    chat.appendChild(wrapper);
    chat.scrollTop = chat.scrollHeight;

    // Animação de entrada
    wrapper.style.opacity = "0";
    wrapper.style.transform = "translateY(8px)";
    requestAnimationFrame(() => {
        wrapper.style.transition = "opacity 0.2s ease, transform 0.2s ease";
        wrapper.style.opacity = "1";
        wrapper.style.transform = "translateY(0)";
    });
}

async function completeLesson() {
    const finishBtn = document.getElementById("lessonFinish");
    if (finishBtn) {
        finishBtn.disabled = true;
        finishBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Salvando...`;
    }

    try {
        const res = await apiCall("/v1/lesson/complete", "POST", { user_id: state.sessionId, score: -1 });

        // XP conquistado
        if (res.xp_gained > 0) {
            showToast(`🎉 +${res.xp_gained} XP conquistados!`, "success", 5000);
            if (res.bonus_reason) {
                setTimeout(() => showToast(`🏆 ${res.bonus_reason}`, "success", 5000), 1000);
            }
        }

        // Dicas de aprendizado
        try {
            const mem = await apiCall(`/v1/learning_memory?user_id=${state.sessionId}`);
            if (mem?.weak_grammar?.length > 0) {
                setTimeout(() => showToast(`💡 Dica: Foque em ${mem.weak_grammar[0]} na próxima!`, "warn", 6000), 2000);
            } else if (mem?.weak_vocab?.length > 0) {
                setTimeout(() => showToast(`💡 Revise a palavra "${mem.weak_vocab[0]}"`, "warn", 6000), 2000);
            }
        } catch (_) { }

        currentLessonId = null;
        setTimeout(() => loadCatalog(), 1500);
    } catch (e) {
        showToast("Erro ao concluir: " + e.message, "err");
        if (finishBtn) {
            finishBtn.disabled = false;
            finishBtn.innerHTML = `<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg> Concluir`;
        }
    }
}

async function stopLesson() {
    if (!confirm("Deseja parar a lição atual? Seu progresso parcial será perdido.")) return;
    try {
        await apiCall("/v1/lesson/stop", "POST", { user_id: state.sessionId });
    } catch (e) { console.error(e); }
    currentLessonId = null;
    loadCatalog();
}
