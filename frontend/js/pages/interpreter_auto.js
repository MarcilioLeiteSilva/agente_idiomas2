// web/js/pages/interpreter_auto.js
import { apiCall } from "../api.js";
import { showToast } from "../ui/toast.js";

let container = null;
let mediaRecorder = null;
let stream = null;
let chunks = [];
let isProcessing = false;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-interp-auto";
    container.innerHTML = `
        <h2>Intérprete Auto 🤖</h2>
        <div class="trans-controls">
            <select id="autoLangA">
                <option value="pt" selected>Português</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
            </select>
            <span>↔️</span>
            <select id="autoLangB">
                <option value="en" selected>English</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
            </select>
        </div>
        
        <div class="auto-mic-container">
            <button id="btnAutoMic" class="btn-auto-mic">🎤</button>
            <p id="autoStatus">Toque para falar</p>
        </div>

        <div class="trans-box result">
            <div id="autoResult" class="trans-text" style="min-height: 150px;">
                <p style="color:#aaa; text-align:center; margin-top:40px;">Histórico da conversa...</p>
            </div>
            <button id="btnClearAuto" class="secondary-btn small" style="margin-top:10px">Limpar</button>
        </div>
    `;
    parent.appendChild(container);

    document.getElementById("btnAutoMic").onclick = toggleRecording;
    document.getElementById("btnClearAuto").onclick = () => {
        document.getElementById("autoResult").innerHTML = "";
    };

    // Initial State: Blue (Idle)
    setVisualState("idle");
}

export function unmount() {
    stopHardware();
    if (container) container.remove();
}

async function toggleRecording() {
    if (isProcessing) return; // Ignore clicks while processing

    const btn = document.getElementById("btnAutoMic");

    if (btn.classList.contains("recording")) {
        // Stop
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    } else {
        // Start
        await startRecording();
    }
}

async function startRecording() {
    stopHardware();
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            await processAudio(blob);
            stopHardware();
        };

        mediaRecorder.start();
        setVisualState("recording");

    } catch (e) {
        showToast("Erro Mic: " + e.message, "err");
        setVisualState("idle");
    }
}

function stopHardware() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

async function processAudio(blob) {
    setVisualState("processing");

    const langA = document.getElementById("autoLangA").value;
    const langB = document.getElementById("autoLangB").value;

    const fd = new FormData();
    fd.append("source_lang_a", langA);
    fd.append("source_lang_b", langB);
    fd.append("file", new File([blob], "rec.webm"));

    try {
        const res = await apiCall("/v1/interpret-auto", "POST", fd);

        if (res.error) throw new Error(res.error);

        appendResult(res);

        if (res.target_audio) {
            const audio = new Audio("data:audio/mp3;base64," + res.target_audio);
            audio.play();
            audio.onended = () => setVisualState("idle");
        } else {
            setVisualState("idle");
        }

    } catch (e) {
        showToast("Erro Auto: " + e.message, "err");
        setVisualState("idle");
    }
}

function setVisualState(st) {
    const btn = document.getElementById("btnAutoMic");
    const lbl = document.getElementById("autoStatus");
    if (!btn) return;

    btn.classList.remove("recording", "processing", "idle");
    isProcessing = false;

    if (st === "recording") {
        btn.classList.add("recording"); // Green
        lbl.innerText = "Ouvindo... (Toque para parar)";
    } else if (st === "processing") {
        btn.classList.add("processing"); // Yellow
        lbl.innerText = "Processando / Traduzindo...";
        isProcessing = true;
    } else {
        btn.classList.add("idle"); // Blue
        lbl.innerText = "Toque para falar";
    }
}

function appendResult(res) {
    const box = document.getElementById("autoResult");
    if (box.querySelector("p")) box.innerHTML = ""; // Clear placeholder

    const div = document.createElement("div");
    div.className = "auto-entry";
    div.innerHTML = `
        <div class="orig"><strong>Orig (${res.detected_language}):</strong> ${res.source_text}</div>
        <div class="arrow">⬇️</div>
        <div class="trans"><strong>Trad:</strong> ${res.target_text}</div>
        <hr/>
    `;
    box.prepend(div);
}
