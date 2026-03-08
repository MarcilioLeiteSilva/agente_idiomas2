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
        <div class="audio-dashboard glass">
            <div class="voice-orb-container">
                <div id="voiceOrb" class="voice-orb idle"></div>
                <div id="statusIndicator" class="badge" style="margin-top: 20px;">Pronto para ouvir</div>
            </div>
            
            <div class="audio-controls-row">
                <button id="btnInit" class="btn btn-primary btn-large">Iniciar Sessão de Voz</button>
                <div id="activeControls" style="display:none; gap: 10px;">
                    <button id="btnPause" class="btn btn-outline">⏸️ Pausar</button>
                    <button id="btnStop" class="btn btn-danger">Encerrar</button>
                </div>
            </div>
        </div>

        <div id="audioLog" class="chatbox" style="margin-top: 24px;"></div>
        <audio id="audioPlayer" style="display:none"></audio>
        
        <div class="hint-card glass" style="margin-top: 16px; padding: 12px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">
            <p>O Agente Idiomas usa detecção automática de silêncio. Fale naturalmente e ele responderá em áudio.</p>
        </div>
    `;
    parent.appendChild(container);

    document.getElementById("btnInit").onclick = startSession;
    document.getElementById("btnPause").onclick = togglePause;
    document.getElementById("btnStop").onclick = endSession;
}

const audioStyles = `
    .audio-dashboard {
        padding: 40px;
        border-radius: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        background: rgba(255,255,255,0.03);
    }
    .voice-orb {
        width: 120px;
        height: 120px;
        background: var(--grad-primary);
        border-radius: 50%;
        box-shadow: 0 0 30px rgba(138, 43, 226, 0.4);
        transition: all 0.5s ease;
    }
    .voice-orb.listening {
        transform: scale(1.1);
        animation: pulseOrb 2s infinite;
        background: linear-gradient(135deg, #10b981, #34d399);
        box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
    }
    .voice-orb.processing {
        animation: spinOrb 1s infinite linear;
        border: 4px dashed var(--primary-light);
    }
    @keyframes pulseOrb {
        0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
        50% { box-shadow: 0 0 60px rgba(16, 185, 129, 0.6); }
        100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
    }
`;

function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("btnPause");
    const orb = document.getElementById("voiceOrb");
    if (isPaused) {
        btn.innerText = "▶️ Retomar";
        updateStatus("Em Pausa");
        orb.style.opacity = "0.5";
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
    } else {
        btn.innerText = "⏸️ Pausar";
        updateStatus("Ouvindo...");
        orb.style.opacity = "1";
        startVAD();
    }
}

function endSession() {
    stopSessionHard();
    document.getElementById("btnInit").style.display = "block";
    document.getElementById("activeControls").style.display = "none";
    updateStatus("Sessão Encerrada");
    document.getElementById("voiceOrb").className = "voice-orb idle";
}

export function unmount() {
    stopSessionHard();
    if (container) container.remove();
}

async function startSession() {
    document.getElementById("btnInit").style.display = "none";
    document.getElementById("activeControls").style.display = "flex";
    sessionActive = true;
    isPaused = false;
    updateStatus("Ativando Microfone...");

    initMic().catch(e => {
        showToast("Erro Mic: " + e.message, "error");
        endSession();
    });
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
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = sendAudio;
    mediaRecorder.start();
    isRecording = true;

    let silenceStart = Date.now();
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
            updateStatus("Falando...");
        } else {
            if (Date.now() - silenceStart > SILENCE_TIME) {
                mediaRecorder.stop();
                isRecording = false;
                updateStatus("Processando...");
                return;
            } else {
                updateStatus("Ouvindo...");
            }
        }
        rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
}

async function sendAudio() {
    if (!chunks.length) return restartVAD();
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.onloadend = async () => {
        const b64 = reader.result.split(",")[1];
        try {
            const res = await apiCall("/v1/message", "POST", {
                session_id: state.sessionId,
                message: { type: "audio", audio: { mime: "audio/webm", base64: b64 } },
                output_mode: "audio"
            });
            handleResponse(res);
        } catch (e) {
            showToast("Erro: " + e.message, "error");
            restartVAD();
        }
    };
    reader.readAsDataURL(blob);
}

async function handleResponse(res) {
    if (res.output?.user_text) appendLog("Você", res.output.user_text, "me");
    if (res.output?.text) appendLog("IA", res.output.text, "bot");

    if (res.output?.audio?.base64) {
        updateStatus("Respondendo...");
        const audio = document.getElementById("audioPlayer");
        audio.src = "data:audio/mp3;base64," + res.output.audio.base64;
        try {
            await audio.play();
            audio.onended = () => restartVAD();
        } catch (e) {
            restartVAD();
        }
    } else {
        restartVAD();
    }
}

function restartVAD() {
    if (sessionActive && !isPaused) startVAD();
}

function stopSessionHard() {
    sessionActive = false;
    isRecording = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (mediaRecorder && mediaRecorder.state !== "inactive") try { mediaRecorder.stop(); } catch (e) { }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
}

function updateStatus(txt) {
    const el = document.getElementById("statusIndicator");
    const orb = document.getElementById("voiceOrb");
    if (el) el.innerText = txt;
    if (orb) {
        if (txt.includes("Ouvindo") || txt.includes("Falando")) orb.className = "voice-orb listening";
        else if (txt.includes("Processando")) orb.className = "voice-orb processing";
        else orb.className = "voice-orb idle";
    }
}

function appendLog(role, text, cls) {
    const log = document.getElementById("audioLog");
    if (!log) return;
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    div.innerHTML = `<div class="msg-content">${text}</div>`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
