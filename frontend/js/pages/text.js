// web/js/pages/text.js
import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-text";
    container.innerHTML = `
        <h2>Chat de Texto</h2>
        <div class="chatbox" id="textLog"></div>
        <div class="input-row">
            <input id="textInput" placeholder="Digite sua mensagem..." />
            <button id="sendTextBtn">Enviar</button>
            <button id="clearTextBtn" class="secondary">Limpar</button>
        </div>
    `;
    parent.appendChild(container);

    document.getElementById("sendTextBtn").onclick = sendText;
    document.getElementById("textInput").onkeydown = (e) => { if (e.key === "Enter") sendText(); };
    document.getElementById("clearTextBtn").onclick = () => document.getElementById("textLog").innerHTML = "";

    showToast("Modo Texto Ativado");
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

        const reply = res.output?.text || "(sem texto)";
        appendMsg("Bot", reply, "bot");

        if (res.ui) {
            // Handle UI actions if needed
            appendMsg("System", "[Menu recebido - não implementado visualmente na v8]", "sys");
        }
    } catch (err) {
        appendMsg("System", "Erro: " + err.message, "err");
    }
}

function appendMsg(role, text, cls) {
    const log = document.getElementById("textLog");
    if (!log) return;
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    div.innerHTML = `<strong>${role}:</strong> ${text}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
