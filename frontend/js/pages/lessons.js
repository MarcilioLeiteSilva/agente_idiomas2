// web/js/pages/lessons.js
import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let currentLessonId = null;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-lessons";
    parent.appendChild(container);

    // Initial State: Catalog
    loadCatalog();
}

export function unmount() {
    if (currentLessonId) {
        // Opcional: Avisar user ou parar lição no backend?
        // Por enquanto apenas limpamos a UI. O backend mantem estado até /stop.
    }
    if (container) container.remove();
}

async function loadCatalog() {
    container.innerHTML = `<h3>Catálogo de Lições</h3><p>Carregando...</p>`;
    try {
        const [list, rec] = await Promise.all([
            apiCall(`/v1/lessons?user_id=${state.sessionId}`),
            apiCall(`/v1/recommendations?user_id=${state.sessionId}`)
        ]);
        renderCatalog(list, rec);
    } catch (e) {
        container.innerHTML = `<p class="error">Erro ao carregar catálogo: ${e.message}</p>`;
    }
}

function renderCatalog(data, rec) {
    container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-xl font-bold text-gray-800 dark:text-white">Trilhas de Aprendizado</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Pratique com lições personalizadas para sua evolução.</p>
        </div>
    `;

    // Recommendation Block - Premium Look
    if (rec && rec.recommended_lesson) {
        const r = rec.recommended_lesson;
        const r_id = r.lesson_id || r.id || r.filename;

        const recDiv = document.createElement("div");
        recDiv.className = "mb-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-xl relative overflow-hidden group";
        recDiv.innerHTML = `
            <div class="absolute top-0 right-0 -mt-4 -me-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
            <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="flex-1">
                    <div class="inline-flex items-center gap-x-1.5 py-1 px-3 rounded-full text-xs font-medium bg-white/20 text-white mb-3">
                        <svg class="flex-shrink-0 w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        Missão Recomendada
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">${r.title}</h3>
                    <p class="text-blue-100 text-sm mb-4 max-w-2xl">${r.objective}</p>
                    <div class="flex items-center gap-x-2 text-xs text-white/80 italic">
                       <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                       ${rec.reason}
                    </div>
                </div>
                <button class="bg-white text-blue-600 hover:bg-gray-100 py-3 px-6 rounded-xl font-bold transition-all shadow-lg active:scale-95 whitespace-nowrap" id="btnStartRec">
                    Começar Agora
                </button>
            </div>
        `;
        recDiv.querySelector("#btnStartRec").onclick = () => startLesson(r_id);
        container.appendChild(recDiv);
    }

    const grid = document.createElement("div");
    grid.className = "grid sm:grid-cols-2 lg:grid-cols-3 gap-6";

    let list = [];
    if (Array.isArray(data)) list = data;
    else if (data && data.lessons) list = data.lessons;

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-10 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl dark:bg-slate-800 dark:border-gray-700">
                <svg class="w-12 h-12 text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                <p class="text-gray-500">Nenhuma lição disponível no momento.</p>
            </div>
        `;
    } else {
        list.forEach(l => {
            const card = document.createElement("div");
            card.className = "group flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl hover:shadow-md transition dark:bg-slate-900 dark:border-gray-700";
            const id = l.lesson_id || l.id || l.filename;

            card.innerHTML = `
                <div class="p-5 flex flex-col h-full">
                    <div class="flex justify-between items-start mb-4">
                        <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500 uppercase tracking-widest">
                            ${l.level || 'A1'}
                        </span>
                    </div>
                    
                    <h4 class="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">${l.title}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow line-clamp-2">
                        ${l.objective}
                    </p>
                    
                    <div class="mt-auto border-t border-gray-100 pt-4 dark:border-gray-800">
                        <button class="w-full py-2.5 px-4 inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 active:scale-[0.98]" id="btnStart-${id}">
                            Praticar Lição
                            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
            card.querySelector(`#btnStart-${id}`).onclick = () => startLesson(id);
        });
    }
    container.appendChild(grid);
}

function renderActiveLesson(data) {
    container.innerHTML = `
        <div class="lesson-active-view">
            <header class="lesson-view-header glass">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="btnLessonExit" class="btn btn-icon">←</button>
                    <h3>${data.lesson.title}</h3>
                </div>
                <div class="step-tracker">
                    <span id="stepBadge" class="badge primary">Passo 1</span>
                </div>
            </header>

            <div class="lesson-content">
                <div class="objective-card glass">
                    <strong>Objetivo:</strong> ${data.lesson.objective}
                </div>
                
                <div id="lessonChat" class="chatbox lesson-chat glass"></div>
                
                <div class="lesson-input-area glass">
                    <div class="input-row">
                        <input id="lessonInput" placeholder="Sua resposta em ${state.userProfile.target_language}..." autocomplete="off"/>
                        <button id="lessonSend" class="btn btn-primary">Enviar</button>
                        <button id="lessonFinish" class="btn btn-success hidden">Finalizar lição</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById("btnLessonExit").onclick = stopLesson;
    document.getElementById("lessonSend").onclick = sendInput;
    document.getElementById("lessonFinish").onclick = completeLesson;
    document.getElementById("lessonInput").onkeydown = (e) => { if (e.key === "Enter") sendInput(); };

    appendMsg("Tutor", data.first_step, "bot");
}

function renderFeedback(fb) {
    const html = `
        <div class="feedback-card-premium glass">
            <div class="fb-header">Avaliação de Desempenho</div>
            <div class="fb-scores-grid">
                <div class="score-item"><span>Gramática</span><strong>${fb.grammar_score}/10</strong></div>
                <div class="score-item"><span>Vocabulário</span><strong>${fb.vocabulary_score}/10</strong></div>
                <div class="score-item"><span>Fluência</span><strong>${fb.fluency_score}/10</strong></div>
            </div>
            <div class="fb-text">${fb.feedback_text}</div>
            ${fb.corrections && fb.corrections.length ? `
                <div class="fb-corrections-list">
                    <strong>Correções sugeridas:</strong>
                    <ul>${fb.corrections.map(c => `<li>${c}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
    `;
    appendMsg("Feedback", "", "fb", html);
    showToast(`Score: ${fb.overall_score}`, "info");
}

// ... rest of logic remains the same (api calls) ...

async function completeLesson() {
    try {
        const res = await apiCall("/v1/lesson/complete", "POST", { user_id: state.sessionId, score: -1 });

        // Fetch tips
        try {
            const mem = await apiCall(`/v1/learning_memory?user_id=${state.sessionId}`);
            if (mem && mem.weak_grammar && mem.weak_grammar.length > 0) {
                showToast(`Dica: Foque em ${mem.weak_grammar[0]} na próxima!`, "warn", 6000);
            } else if (mem && mem.weak_vocab && mem.weak_vocab.length > 0) {
                showToast(`Dica: Revise a palavra '${mem.weak_vocab[0]}'.`, "warn", 6000);
            } else {
                showToast("Ótimo trabalho! Continue assim.", "success");
            }
        } catch (e) {
            showToast("Lição concluída!", "success");
        }

        // alert(`Lição concluída!`); // Removido alert intrusivo
        currentLessonId = null;
        loadCatalog();
    } catch (e) {
        showToast("Erro ao concluir: " + e.message, "err");
    }
}

async function stopLesson() {
    if (!confirm("Parar lição?")) return;
    try {
        await apiCall("/v1/lesson/stop", "POST", { user_id: state.sessionId });
    } catch (e) { console.error(e); }
    currentLessonId = null;
    loadCatalog();
}
