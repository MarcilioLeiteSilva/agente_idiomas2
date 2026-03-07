// web/js/pages/audio.js
import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let stream = null;
let audioCtx = null;
let analyser = null;
let mediaRecorder = null;
let rafId = null;
let chunks = [];
let isRecording = false;
let isPaused = false;
let sessionActive = false;
let audioState = "idle"; // idle, listening, sending, playing

// VAD Constants
const SILENCE_THRESH = 0.02;
const SILENCE_TIME = 2000;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-audio";
    container.innerHTML = `
        <h2>Chat por Voz</h2>
        <div class="audio-controls">
            <button id="btnInit" class="primary-btn">Iniciar Conversa</button>
            <button id="btnPause" class="secondary-btn" style="display:none; margin-left:10px;">⏸️ Pausar</button>
            <button id="btnStop" class="secondary-btn" style="display:none; margin-left:10px;">Encerrar</button>
            <button id="btnClear" class="secondary-btn" title="Limpar conversa" style="margin-left:auto;">🗑️</button>
            <div id="statusIndicator" class="status-badge" style="margin-left:10px;">Pronto</div>
        </div>
        <div id="audioLog" class="chatbox"></div>
        <audio id="audioPlayer" controls style="display:none"></audio>
        <p class="hint">Clique em Iniciar. O microfone detectará sua fala automaticamente.</p>
    `;
    parent.appendChild(container);

    document.getElementById("btnInit").onclick = startSession;
    document.getElementById("btnPause").onclick = togglePause;
    document.getElementById("btnStop").onclick = endSession;
    document.getElementById("btnClear").onclick = () => document.getElementById("audioLog").innerHTML = "";
}

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("btnPause");
    if (isPaused) {
        btn.innerText = "▶️ Retomar";
        btn.classList.add("warn");
        updateStatus("Pausado ⏸️");
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
        // Don't send partial chunks if paused manually? Or send them?
        // Basic pause: just stop listening.
    } else {
        btn.innerText = "⏸️ Pausar";
        btn.classList.remove("warn");
        updateStatus("Ouvindo... 👂");
        startVAD();
    }
}

function endSession() {
    stopSessionHard();
    document.getElementById("btnInit").style.display = "inline";
    document.getElementById("btnStop").style.display = "none";
    document.getElementById("btnPause").style.display = "none";

    // Reset Pause UI
    isPaused = false;
    const btn = document.getElementById("btnPause");
    if (btn) { btn.innerText = "⏸️ Pausar"; btn.classList.remove("warn"); }

    updateStatus("Encerrado");
}

export function unmount() {
    stopSessionHard();
    if (container) container.remove();
}

async function startSession() {
    document.getElementById("btnInit").style.display = "none";
    document.getElementById("btnStop").style.display = "inline";
    document.getElementById("btnPause").style.display = "inline";
    sessionActive = true;
    isPaused = false;
    updateStatus("Inicializando Mic...");

    try {
        await initMic();
        updateStatus("Ouvindo... 👂");
    } catch (e) {
        updateStatus("Erro Mic");
        showToast(e.message, "err");
        sessionActive = false;
        document.getElementById("btnInit").style.display = "inline";
    }
}

async function initMic() {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const src = audioCtx.createMediaStreamSource(stream);
    src.connect(analyser);

    startVAD();
}

function startVAD() {
    if (!sessionActive) return;

    // Setup Recorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = sendAudio; // When stops, send

    mediaRecorder.start();
    isRecording = true;

    let silenceStart = 0;
    const dataArray = new Uint8Array(analyser.fftSize);

    function loop() {
        if (!sessionActive || !isRecording || isPaused) return;

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        if (rms > SILENCE_THRESH) {
            silenceStart = Date.now();
            updateStatus("Falando... 🎤");
        } else {
            if (Date.now() - silenceStart > SILENCE_TIME) {
                // Detected Silence -> Stop & Send
                mediaRecorder.stop();
                isRecording = false;
                updateStatus("Processando... ⏳");
                return; // Stop loop
            } else {
                updateStatus("Ouvindo... 👂");
            }
        }
        rafId = requestAnimationFrame(loop);
    }

    silenceStart = Date.now(); // Init
    rafId = requestAnimationFrame(loop);
}

async function sendAudio() {
    if (!chunks.length) return restartVAD();

    const blob = new Blob(chunks, { type: 'audio/webm' });
    chunks = [];

    // Convert blob to base64 manually or use FormData if backend supported it for chat.
    // Legacy implementation used JSON { audio: { base64: ... } }.
    // We stick to legacy protocol.

    const reader = new FileReader();
    reader.onloadend = async () => {
        const b64 = reader.result.split(",")[1];

        try {
            const res = await apiCall("/v1/message", "POST", {
                session_id: state.sessionId,
                message: { type: "audio", audio: { mime: "audio/webm", base64: b64 } }
            });

            handleResponse(res);

        } catch (e) {
            showToast("Erro envio: " + e.message, "err");
            restartVAD(); // Try again
        }
    };
    reader.readAsDataURL(blob);
}

async function handleResponse(res) {
    appendLog("Você", res.output?.user_text || "(áudio)");
    appendLog("Bot", res.output?.text || "...");

    if (res.output?.audio?.base64) {
        updateStatus("Respondendo... 🔊");
        const audio = document.getElementById("audioPlayer");
        audio.src = "data:audio/mp3;base64," + res.output.audio.base64;
        try {
            await audio.play();
            audio.onended = () => {
                restartVAD();
            };
        } catch (e) {
            console.error("Play error", e);
            restartVAD();
        }
    } else {
        restartVAD();
    }
}

function restartVAD() {
    if (sessionActive) startVAD();
}

function stopSessionHard() {
    sessionActive = false;
    isRecording = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }

    const audio = document.getElementById("audioPlayer");
    if (audio) { audio.pause(); audio.src = ""; }
}

function updateStatus(txt) {
    const el = document.getElementById("statusIndicator");
    if (el) el.innerText = txt;
}

function appendLog(role, text) {
    const log = document.getElementById("audioLog");
    if (!log) return;
    const div = document.createElement("div");
    div.innerHTML = `<strong>${role}:</strong> ${text}`;
    div.style.marginBottom = "5px";
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
