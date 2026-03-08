// web/js/pages/progress.js
import { apiCall } from "../api.js";
import { state } from "../state.js";

let container = null;

export async function mount(parent) {
    container = document.createElement("div");
    container.innerHTML = `<h3>Carregando progresso...</h3>`;
    parent.appendChild(container);

    try {
        const [progressData, memoryData, reviewHistory, statsData, lessonsData] = await Promise.all([
            apiCall(`/v1/progress?user_id=${state.sessionId}`),
            apiCall(`/v1/learning_memory?user_id=${state.sessionId}`),
            apiCall(`/v1/review/history?user_id=${state.sessionId}`),
            apiCall(`/v1/stats?user_id=${state.sessionId}`),
            apiCall(`/v1/lessons?user_id=${state.sessionId}`).catch(() => null)
        ]);
        render(progressData, memoryData, reviewHistory, statsData, lessonsData);
    } catch (e) {
        container.innerHTML = `<p style="color:red">Erro: ${e.message}</p>`;
    }
}

export function unmount() {
    if (container) container.remove();
}

function render(list, memory, reviews, stats, lessonsData) {
    const completed = list.filter(p => p.status === 'completed');
    const avg = completed.length ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length) : 0;

    // Mapa: lesson_id -> título real
    const lessonTitleMap = {};
    if (lessonsData) {
        const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);
        lessons.forEach(l => {
            const id = l.lesson_id || l.id;
            if (id) lessonTitleMap[id] = l.title;
        });
    }

    // Helper: extrair texto de item que pode ser string ou {word/rule/error: '...', count: N}
    function extractText(item, fields = ['word', 'rule', 'error', 'item']) {
        if (typeof item === 'string') return item;
        if (typeof item === 'object' && item !== null) {
            for (const f of fields) {
                if (item[f]) return item[f];
            }
            return JSON.stringify(item);
        }
        return String(item);
    }

    let weakVocabHTML = "";
    if (memory?.weak_vocab?.length > 0) {
        weakVocabHTML = `
            <div class="mb-4">
                <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Vocabulário para Revisar</h4>
                <div class="flex flex-wrap gap-2">
                    ${memory.weak_vocab.slice(0, 10).map(w => {
            const text = extractText(w, ['word']);
            const count = typeof w === 'object' ? (w.count || 1) : 1;
            return `<span class="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500" title="${count}x encontrado">${text}</span>`;
        }).join('')}
                </div>
            </div>
        `;
    }

    let weakGrammarHTML = "";
    if (memory?.weak_grammar?.length > 0) {
        weakGrammarHTML = `
            <div class="mb-4">
                <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Atenção Gramatical</h4>
                <ul class="space-y-2">
                    ${memory.weak_grammar.slice(0, 5).map(g => {
            const text = extractText(g, ['rule']);
            return `
                        <li class="flex items-center gap-x-2 text-sm text-gray-600 dark:text-gray-400">
                             <svg class="w-4 h-4 text-amber-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                             ${text}
                        </li>`;
        }).join('')}
                </ul>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="space-y-8">
            <div class="flex items-center justify-between xl:justify-end">
                <button class="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-md" onclick="startMicroReview('${state.sessionId}')">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4-4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                    Treinar Pontos Fracos
                </button>
            </div>
            
            <!-- Stats Grid -->
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <!-- XP Card -->
                <div class="flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl dark:bg-slate-900 dark:border-gray-700">
                    <div class="p-4 md:p-5 flex gap-x-4">
                        <div class="flex-shrink-0 flex justify-center items-center w-[46px] h-[46px] bg-amber-100 rounded-xl dark:bg-amber-900/30">
                            <svg class="flex-shrink-0 w-5 h-5 text-amber-600 dark:text-amber-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <div class="grow">
                            <p class="text-xs uppercase tracking-wide text-gray-500">XP Total</p>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${stats.xp}</h3>
                        </div>
                    </div>
                </div>

                <!-- Streak Card -->
                <div class="flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl dark:bg-slate-900 dark:border-gray-700">
                    <div class="p-4 md:p-5 flex gap-x-4">
                        <div class="flex-shrink-0 flex justify-center items-center w-[46px] h-[46px] bg-red-100 rounded-xl dark:bg-red-900/30">
                            <svg class="flex-shrink-0 w-5 h-5 text-red-600 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 3.5 2 5a4.5 4.5 0 0 1-9 0Z"/></svg>
                        </div>
                        <div class="grow">
                            <p class="text-xs uppercase tracking-wide text-gray-500">Ofensiva</p>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${stats.streak_days} Dias</h3>
                        </div>
                    </div>
                </div>

                <!-- Lessons Card -->
                <div class="flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl dark:bg-slate-900 dark:border-gray-700">
                    <div class="p-4 md:p-5 flex gap-x-4">
                        <div class="flex-shrink-0 flex justify-center items-center w-[46px] h-[46px] bg-blue-100 rounded-xl dark:bg-blue-900/30">
                            <svg class="flex-shrink-0 w-5 h-5 text-blue-600 dark:text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg>
                        </div>
                        <div class="grow">
                            <p class="text-xs uppercase tracking-wide text-gray-500">Lições</p>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${completed.length}</h3>
                        </div>
                    </div>
                </div>

                <!-- Media Card -->
                <div class="flex flex-col bg-white border border-gray-200 shadow-sm rounded-2xl dark:bg-slate-900 dark:border-gray-700">
                    <div class="p-4 md:p-5 flex gap-x-4">
                        <div class="flex-shrink-0 flex justify-center items-center w-[46px] h-[46px] bg-emerald-100 rounded-xl dark:bg-emerald-900/30">
                            <svg class="flex-shrink-0 w-5 h-5 text-emerald-600 dark:text-emerald-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
                        </div>
                        <div class="grow">
                            <p class="text-xs uppercase tracking-wide text-gray-500">Média</p>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-200">${avg}<span class="text-sm font-normal text-gray-400">/100</span></h3>
                        </div>
                    </div>
                </div>
            </div>

            <div id="reviewContainer" class="hidden"></div>

            <div class="grid lg:grid-cols-2 gap-6">
                <!-- Memory Section -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white">Pontos de Atenção</h3>
                    <div class="bg-white border border-gray-200 rounded-2xl p-6 dark:bg-slate-900 dark:border-gray-700">
                        ${weakVocabHTML || '<p class="text-sm text-gray-500 italic mb-4">Vocabulário em dia!</p>'}
                        <div class="border-t border-gray-100 dark:border-gray-800 pt-5 mt-5">
                             ${weakGrammarHTML || '<p class="text-sm text-gray-500 italic">Gramática sem erros graves.</p>'}
                        </div>
                    </div>
                </div>

                <!-- History Section -->
                <div class="space-y-4">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white">Atividades Recentes</h3>
                    <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden dark:bg-slate-900 dark:border-gray-700">
                        <ul class="divide-y divide-gray-100 dark:divide-gray-800">
                            ${list.slice(-5).reverse().map(item => {
        const lessonTitle = lessonTitleMap[item.lesson_id] || item.lesson_id;
        const langFlag = item.target_language === 'en' ? '🇺🇸' : item.target_language === 'fr' ? '🇫🇷' : item.target_language === 'es' ? '🇪🇸' : '📚';
        const dateStr = item.started_at ? new Date(item.started_at).toLocaleDateString('pt-BR') : '—';
        const isCompleted = item.status === 'completed';
        return `
                                <li class="px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                    <div class="flex justify-between items-center gap-3">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <span class="text-lg flex-shrink-0">${langFlag}</span>
                                            <div class="min-w-0">
                                                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">${lessonTitle}</p>
                                                <p class="text-xs text-gray-400">${dateStr} &middot; <span class="font-mono text-[10px] opacity-60">${item.lesson_id}</span></p>
                                            </div>
                                        </div>
                                        <div class="flex-shrink-0">
                                            ${isCompleted
                ? `<span class="inline-flex items-center gap-x-1 py-1 px-2.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500">✓ ${item.score}</span>`
                : `<span class="inline-flex items-center gap-x-1 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">Incompleta</span>`
            }
                                        </div>
                                    </div>
                                </li>`;
    }).join('')}
                            ${list.length === 0 ? '<li class="p-8 text-center text-gray-500">Nenhuma lição no histórico.</li>' : ''}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.startMicroReview = startMicroReview;
}

let activeReviewItems = [];
let currentReviewIndex = 0;
let reviewSessionId = null;
let reviewContainer = null;

async function startMicroReview(userId) {
    const rc = document.getElementById("reviewContainer");
    if (!rc) return;
    reviewContainer = rc;

    rc.classList.remove("hidden");
    rc.innerHTML = `<div class="review-box loading">Gerando exercícios personalizados...</div>`;

    try {
        const res = await apiCall("/v1/review/start", "POST", { user_id: userId, items: 5 });
        reviewSessionId = res.review_session_id;
        activeReviewItems = res.items;
        currentReviewIndex = 0;

        if (activeReviewItems.length === 0) {
            rc.innerHTML = `<div class="review-box">Nenhum ponto fraco identificado para revisar agora!</div>`;
            return;
        }

        renderReviewItem();
    } catch (e) {
        rc.innerHTML = `<div class="review-box error">Erro ao iniciar: ${e.message}</div>`;
    }
}

function renderReviewItem() {
    if (currentReviewIndex >= activeReviewItems.length) {
        finishReview();
        return;
    }

    const item = activeReviewItems[currentReviewIndex];
    reviewContainer.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-md dark:bg-slate-900 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
            <div class="flex justify-between items-center mb-6">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Exercício ${currentReviewIndex + 1}/${activeReviewItems.length}</span>
                <span class="inline-flex items-center gap-x-1.5 py-1 px-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500">Foco: ${item.expected_focus}</span>
            </div>
            
            <div class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-6">${item.prompt}</div>
            
            <div class="space-y-4">
                <div class="relative">
                    <input id="revInput" type="text" class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" placeholder="Sua resposta..." autocomplete="off">
                    <button id="revSubmit" class="absolute top-1 right-1 py-2 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all">
                        Verificar
                    </button>
                </div>
                
                <div id="revFeedback" class="hidden p-4 rounded-xl text-sm animate-in slide-in-from-top-2 duration-300"></div>
                
                <div class="flex justify-end">
                    <button id="revNext" class="hidden py-2 px-6 inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md">
                        Próximo <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("revSubmit").onclick = () => submitReviewAnswer(item);
    document.getElementById("revInput").onkeydown = (e) => { if (e.key === "Enter") submitReviewAnswer(item); };
    document.getElementById("revNext").onclick = () => {
        currentReviewIndex++;
        renderReviewItem();
    };

    setTimeout(() => document.getElementById("revInput").focus(), 100);
}

async function submitReviewAnswer(item) {
    const input = document.getElementById("revInput");
    const val = input.value.trim();
    if (!val) return;

    input.disabled = true;
    document.getElementById("revSubmit").disabled = true;
    document.getElementById("revSubmit").innerText = "Avaliando...";

    try {
        const res = await apiCall("/v1/review/answer", "POST", {
            user_id: state.sessionId,
            review_session_id: reviewSessionId,
            exercise_id: item.id,
            type: item.type,
            user_input: val,
            expected_focus: item.expected_focus
        });

        const fb = document.getElementById("revFeedback");
        fb.classList.remove("hidden");

        const isCorrect = res.score >= 70;
        fb.className = `p-4 rounded-xl text-sm ${isCorrect ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-500' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/10 dark:text-amber-500'}`;
        fb.innerHTML = `
            <div class="flex gap-x-2">
                <div class="flex-shrink-0">
                    ${isCorrect
                ? '<svg class="h-4 w-4 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg class="h-4 w-4 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
            }
                </div>
                <div>
                    <p class="font-bold">${isCorrect ? 'Muito bem!' : 'Quase lá'}</p>
                    <p class="mt-1">${res.feedback}</p>
                    ${res.corrections && res.corrections.length ? `<p class="mt-2 text-xs font-mono opacity-80">Melhor: ${res.corrections[0]}</p>` : ''}
                </div>
            </div>
        `;

        document.getElementById("revSubmit").classList.add("hidden");
        const btnNext = document.getElementById("revNext");
        btnNext.classList.remove("hidden");
        btnNext.focus();

    } catch (e) {
        document.getElementById("revFeedback").innerText = "Erro: " + e.message;
        input.disabled = false;
    }
}

async function finishReview() {
    reviewContainer.innerHTML = `<div class="p-8 text-center"><div class="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status"></div><p class="mt-2 text-gray-500">Finalizando sessão...</p></div>`;
    try {
        await apiCall("/v1/review/complete", "POST", { user_id: state.sessionId, review_session_id: reviewSessionId });
        reviewContainer.innerHTML = `
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center dark:bg-emerald-900/10 dark:border-emerald-900/20">
                <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <h3 class="text-xl font-bold text-emerald-800 dark:text-emerald-400">Sessão Concluída! 🎉</h3>
                <p class="text-emerald-700 dark:text-emerald-500/80 mb-6">Seus pontos fracos foram reforçados e seu progresso atualizado.</p>
                <button onclick="mount(document.querySelector('.main-content'))" class="py-2.5 px-6 inline-flex items-center gap-x-2 text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md">
                    Ver Meu Novo Status
                </button>
            </div>
        `;
    } catch (e) {
        reviewContainer.innerHTML = `<div class="p-4 bg-red-50 text-red-800 rounded-xl">Erro ao finalizar.</div>`;
    }
}
