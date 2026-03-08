import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let currentMode = "free";

export function mount(parent) {
    container = document.createElement("div");
    container.className = "flex flex-col h-full gap-4 p-4";
    container.innerHTML = `
        <div class="flex flex-col h-[calc(100vh-14rem)] bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-slate-900 dark:border-gray-700">
            <!-- Header/Modes -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div class="inline-flex p-1 bg-gray-100 rounded-lg dark:bg-slate-800">
                    <button class="mode-tag py-1 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-md text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white" data-mode="free">
                        Livre
                    </button>
                    <button class="mode-tag py-1 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-md text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white" data-mode="roleplay">
                        Roleplay
                    </button>
                    <button class="mode-tag py-1 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-md text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white" data-mode="eval">
                        Avaliação
                    </button>
                </div>
                <button id="clearTextBtn" class="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>

            <!-- Chat Log -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4" id="textLog">
                <div class="max-w-[85%] flex flex-col items-center justify-center h-full mx-auto text-center">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 dark:bg-blue-900/30">
                        <svg class="w-8 h-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Olá! Como posso ajudar hoje?</h3>
                    <p class="text-gray-600 dark:text-gray-400">Inicie uma conversa no modo livre ou escolha um cenário de Roleplay.</p>
                </div>
            </div>

            <!-- Input Area -->
            <div class="p-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-x-2">
                    <input id="textInput" type="text" class="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" placeholder="Digite sua mensagem...">
                    <button id="sendTextBtn" type="button" class="inline-flex justify-center items-center h-[2.875rem] w-[2.875rem] rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none">
                        <svg class="flex-shrink-0 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    parent.appendChild(container);

    if (window.lucide) window.lucide.createIcons();

    document.getElementById("sendTextBtn").onclick = sendText;
    document.getElementById("textInput").onkeydown = (e) => { if (e.key === "Enter") sendText(); };
    document.getElementById("clearTextBtn").onclick = () => {
        if (confirm("Deseja mesmo limpar o histórico desta sessão?")) {
            const log = document.getElementById("textLog");
            log.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 space-y-2">
                    <i data-lucide="message-square-dashed" class="w-12 h-12"></i>
                    <p class="text-sm">Conversa limpa. Pronto para o próximo desafio?</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    };

    // Mode Selector Logic
    container.querySelectorAll(".mode-tag").forEach(tag => {
        // Inicializar o estado visual do modo padrão
        if (tag.dataset.mode === currentMode) {
            tag.classList.remove("opacity-50");
            tag.classList.add("bg-violet-500/10", "text-violet-400");
        }

        tag.onclick = () => {
            container.querySelectorAll(".mode-tag").forEach(t => {
                t.classList.add("opacity-50");
                t.classList.remove("bg-violet-500/10", "text-violet-400");
            });
            tag.classList.remove("opacity-50");
            tag.classList.add("bg-violet-500/10", "text-violet-400");
            currentMode = tag.dataset.mode;
            showToast(`Modo alterado para: ${tag.innerText}`);
        };
    });
}

export function unmount() {
    if (container) container.remove();
}

async function sendText() {
    const input = document.getElementById("textInput");
    const text = input.value.trim();
    if (!text) return;

    appendMsg("Você", text, "me");
    input.value = "";

    try {
        // Obter dados do perfil/estado para o payload plano
        const profile = state.userProfile || {};

        const payload = {
            session_id: state.sessionId,
            message: text,
            mode: currentMode,
            scenario: state.currentScenario || null,
            evaluation: currentMode === "eval",
            user_level: profile.level || "A1",
            target_language: profile.target_language || "en",
            native_language: profile.native_language || "pt"
        };

        const res = await apiCall("/v1/message", "POST", payload);

        if (res.type === "evaluation_report") {
            renderEvaluationReport(res);
        } else {
            const reply = res.output?.text || "(sem resposta)";
            appendMsg("IA", reply, "bot");
        }

        if (res.ui) {
            // Future UI Actions
        }
    } catch (err) {
        appendMsg("Sistema", "Erro ao conectar: " + err.message, "err");
    }
}

function renderEvaluationReport(data) {
    const log = document.getElementById("textLog");
    if (!log) return;

    // Remove empty state message if exists
    if (log.querySelector('.text-slate-500')) {
        log.innerHTML = '';
    }

    const { summary, scores, strengths, weaknesses, evidence, recommendations } = data;

    const div = document.createElement("div");
    div.className = "w-full my-8 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500";

    div.innerHTML = `
        <!-- Cabeçalho -->
        <div class="bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 p-6 border-b border-white/5">
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <i data-lucide="award" class="text-yellow-400"></i>
                        Relatório da Sessão
                    </h3>
                    <p class="text-slate-400 text-sm mt-1">Análise detalhada do seu desempenho</p>
                </div>
                <div class="flex flex-col items-end">
                    <span class="text-4xl font-black text-violet-400 leading-none">${summary.overall_score}</span>
                    <span class="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">Score Global</span>
                    <div class="mt-2 flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                         <span class="text-[9px] font-bold uppercase tracking-tight">${summary.communicative_success ? 'Missão Concluída' : 'Tente Novamente'}</span>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                <p class="text-slate-200 text-sm italic flex-1">"${summary.message}"</p>
                <div class="ml-4 text-center">
                    <span class="block text-xl font-bold text-fuchsia-400">+${data.xp_earned || 0}</span>
                    <span class="text-[9px] uppercase font-bold text-slate-500">XP</span>
                </div>
            </div>
        </div>

        <!-- Métricas -->
        <div class="grid grid-cols-3 gap-0 border-b border-white/5">
            <div class="p-6 text-center border-r border-white/5">
                <span class="block text-2xl font-bold text-white">${scores.grammar}</span>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gramática</span>
            </div>
            <div class="p-6 text-center border-r border-white/5">
                <span class="block text-2xl font-bold text-white">${scores.vocabulary}</span>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Vocabulário</span>
            </div>
            <div class="p-6 text-center">
                <span class="block text-2xl font-bold text-white">${scores.fluency}</span>
                <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fluência</span>
            </div>
        </div>

        <!-- Feedback Pedagógico -->
        <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h4 class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> Pontos Fortes
                </h4>
                <ul class="space-y-3">
                    ${strengths.map(s => `<li class="text-sm text-slate-300 flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div> ${s}</li>`).join('')}
                </ul>
            </div>
            <div>
                <h4 class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i data-lucide="trending-up" class="w-4 h-4"></i> A Melhorar
                </h4>
                <ul class="space-y-3">
                    ${weaknesses.map(w => `<li class="text-sm text-slate-300 flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div> ${w}</li>`).join('')}
                </ul>
            </div>
        </div>

        <!-- Evidências -->
        ${evidence && evidence.length > 0 ? `
        <div class="px-6 pb-6 pt-2">
            <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Evidências e Sugestões</h4>
            <div class="space-y-3">
                ${evidence.map(e => `
                    <div class="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full uppercase">${e.category}</span>
                            <span class="text-[10px] text-slate-500 italic">${e.issue}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <span class="text-[9px] uppercase font-bold text-slate-500 block mb-1">Você disse</span>
                                <p class="text-sm text-rose-300 line-through decoration-rose-500/50">${e.example_user}</p>
                            </div>
                            <div>
                                <span class="text-[9px] uppercase font-bold text-emerald-500 block mb-1">Sugestão</span>
                                <p class="text-sm text-emerald-400 font-medium">${e.suggestion}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Recomendações e CTA -->
        <div class="p-6 bg-violet-600/10 border-t border-white/5">
            <h4 class="text-xs font-bold text-violet-300 uppercase tracking-widest mb-4 text-center">Próximos Passos</h4>
            ${data.engine_reason ? `<p class="text-[11px] text-slate-400 text-center mb-6 max-w-md mx-auto italic">"${data.engine_reason}"</p>` : ''}
            <div class="flex flex-wrap gap-2 justify-center">
                ${recommendations.map(r => `
                    <button class="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-medium transition-all shadow-sm">
                        ${r.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
}

function appendMsg(role, text, cls) {
    const log = document.getElementById("textLog");
    if (!log) return;

    // Remove empty state message or old single-message if exists
    if (log.querySelector('.max-w-\\[85\\%\\]') || log.querySelector('.text-slate-500')) {
        log.innerHTML = '';
    }

    const div = document.createElement("div");
    const formattedText = text.replace(/\n/g, '<br>');

    if (cls === 'me') {
        // Chat Bubble Out (User)
        div.className = "flex ms-auto gap-x-2 sm:gap-x-4 max-w-[85%] mb-4 animate-in slide-in-from-right-2 duration-300";
        div.innerHTML = `
            <div class="grow text-end space-y-3">
                <div class="inline-block bg-blue-600 rounded-2xl p-4 shadow-sm">
                    <p class="text-sm text-white">${formattedText}</p>
                </div>
            </div>
            <span class="flex-shrink-0 inline-flex items-center justify-center h-[2.375rem] w-[2.375rem] rounded-full bg-gray-600">
                <span class="text-sm font-medium text-white leading-none">EU</span>
            </span>
        `;
    } else {
        // Chat Bubble In (Bot)
        div.className = "flex gap-x-2 sm:gap-x-4 max-w-[85%] mb-4 animate-in slide-in-from-left-2 duration-300";
        div.innerHTML = `
            <span class="flex-shrink-0 inline-flex items-center justify-center h-[2.375rem] w-[2.375rem] rounded-full bg-blue-600">
                <span class="text-sm font-medium text-white leading-none">AI</span>
            </span>
            <div class="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 dark:bg-slate-900 dark:border-gray-700 shadow-sm">
                <p class="text-sm text-gray-800 dark:text-white">${formattedText}</p>
            </div>
        `;
    }

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
