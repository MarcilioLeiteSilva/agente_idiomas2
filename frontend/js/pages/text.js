import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let currentMode = "free";

export function mount(parent) {
    container = document.createElement("div");
    container.className = "flex flex-col h-full gap-4 p-4";
    container.innerHTML = `
        <div class="flex items-center gap-2 mb-2 p-1 bg-white/5 rounded-2xl w-fit">
            <button class="mode-tag px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10 active:scale-95" data-mode="free">Chat Livre</button>
            <button class="mode-tag px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10 active:scale-95 opacity-50" data-mode="roleplay">Roleplay</button>
            <button class="mode-tag px-4 py-1.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10 active:scale-95 opacity-50" data-mode="eval">Avaliação</button>
        </div>
        
        <div class="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar" id="textLog">
            <div class="flex flex-col items-center justify-center h-full text-slate-500 opacity-50 space-y-2">
                <i data-lucide="message-square-dashed" class="w-12 h-12"></i>
                <p class="text-sm">Inicie uma conversa para começar a praticar!</p>
            </div>
        </div>

        <div class="mt-auto space-y-3">
            <div class="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-3xl shadow-xl focus-within:border-violet-500/50 transition-all">
                <input id="textInput" 
                    placeholder="Escreva algo em inglês ou francês..." 
                    class="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 px-2"
                    autocomplete="off"
                />
                <button id="sendTextBtn" class="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white transition-all active:scale-90 shadow-lg shadow-violet-600/20">
                    <i data-lucide="send" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="flex justify-between items-center px-4">
                <span class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Respostas via IA Claude 3.5</span>
                <button id="clearTextBtn" class="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                    Limpar Conversa
                </button>
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

    // Remove empty state message if exists
    if (log.querySelector('.text-slate-500')) {
        log.innerHTML = '';
    }

    const div = document.createElement("div");
    div.className = `flex flex-col ${cls === 'me' ? 'items-end' : 'items-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`;

    const formattedText = text.replace(/\n/g, '<br>');
    const bubbleClass = cls === 'me'
        ? 'bg-violet-600 text-white rounded-2xl rounded-tr-none px-4 py-3 shadow-lg shadow-violet-900/10'
        : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm';

    div.innerHTML = `
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1 px-1">${role}</span>
        <div class="${bubbleClass} max-w-[85%] text-sm leading-relaxed">
            ${formattedText}
        </div>
    `;

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
