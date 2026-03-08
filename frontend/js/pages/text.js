import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

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
        tag.onclick = () => {
            container.querySelectorAll(".mode-tag").forEach(t => t.classList.add("opacity-50"));
            tag.classList.remove("opacity-50");
            tag.classList.add("bg-violet-500/10", "text-violet-400");
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
        const res = await apiCall("/v1/message", "POST", {
            session_id: state.sessionId,
            message: { type: "text", text }
        });

        const reply = res.output?.text || "(sem resposta)";
        appendMsg("IA", reply, "bot");

        if (res.ui) {
            // Future UI Actions
        }
    } catch (err) {
        appendMsg("Sistema", "Erro ao conectar: " + err.message, "err");
    }
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
