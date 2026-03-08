import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-text";
    container.innerHTML = `
        <div class="chat-mode-selector">
            <span class="mode-tag active" data-mode="free">Chat Livre</span>
            <span class="mode-tag" data-mode="roleplay">Roleplay</span>
            <span class="mode-tag" data-mode="eval">Avaliação</span>
        </div>
        <div class="chatbox" id="textLog"></div>
        <div class="input-area">
            <div class="input-row glass">
                <input id="textInput" placeholder="Pratique seu inglês ou francês aqui..." autocomplete="off"/>
                <button id="sendTextBtn" class="btn btn-primary" style="padding: 8px 16px; border-radius: 8px;">Enviar</button>
            </div>
            <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
                 <button id="clearTextBtn" class="btn btn-outline" style="font-size: 0.7rem; padding: 4px 8px;">Limpar Conversa</button>
            </div>
        </div>
    `;
    parent.appendChild(container);

    document.getElementById("sendTextBtn").onclick = sendText;
    document.getElementById("textInput").onkeydown = (e) => { if (e.key === "Enter") sendText(); };
    document.getElementById("clearTextBtn").onclick = () => {
        if (confirm("Deseja mesmo limpar o histórico desta sessão?")) {
            document.getElementById("textLog").innerHTML = "";
        }
    };

    // Mode Selector Logic
    container.querySelectorAll(".mode-tag").forEach(tag => {
        tag.onclick = () => {
            container.querySelectorAll(".mode-tag").forEach(t => t.classList.remove("active"));
            tag.classList.add("active");
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
    const div = document.createElement("div");
    div.className = `msg ${cls}`;

    // Suporte básico a markdown ou novas linhas
    const formattedText = text.replace(/\n/g, '<br>');

    div.innerHTML = `<div class="msg-content">${formattedText}</div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
