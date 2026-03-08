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
        <div class="max-w-3xl mx-auto space-y-6">
            <div class="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm dark:bg-slate-900 dark:border-gray-700 text-center">
                <div class="mb-8 flex justify-center">
                    <div id="voiceOrb" class="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all duration-500 scale-100">
                        <svg class="w-12 h-12 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    </div>
                </div>
                
                <span id="statusIndicator" class="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500 mb-6 uppercase tracking-wider">
                    <span class="w-2 h-2 inline-block rounded-full bg-blue-600 animate-pulse"></span>
                    Pronto para ouvir
                </span>
                
                <div class="flex justify-center gap-4">
                    <button id="btnInit" class="py-3 px-8 inline-flex items-center gap-x-2 text-sm font-bold rounded-xl border border-transparent bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                        Iniciar Sessão de Voz
                    </button>
                    <div id="activeControls" class="hidden gap-x-3">
                        <button id="btnPause" class="py-3 px-6 inline-flex items-center gap-x-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 transition-all active:scale-95">
                            ⏸️ Pausar
                        </button>
                        <button id="btnStop" class="py-3 px-6 inline-flex items-center gap-x-2 text-sm font-semibold rounded-xl border border-transparent bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg active:scale-95">
                            Encerrar
                        </button>
                    </div>
                </div>
            </div>

            <div id="audioLog" class="bg-white border border-gray-200 rounded-2xl p-4 h-[300px] overflow-y-auto dark:bg-slate-900 dark:border-gray-700 space-y-3">
                 <!-- Logs will appear here -->
            </div>
            
            <audio id="audioPlayer" class="hidden"></audio>
            
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 dark:bg-amber-900/10 dark:border-amber-900/20">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </div>
                    <div class="ms-3">
                        <p class="text-xs text-amber-800 dark:text-amber-400 italic">
                            O Agente Idiomas usa detecção automática de silêncio. Fale naturalmente e ele responderá em áudio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    parent.appendChild(container);

    document.getElementById("btnInit").onclick = startSession;
    document.getElementById("btnPause").onclick = togglePause;
    document.getElementById("btnStop").onclick = endSession;
}


function togglePause() {
    isPaused = !isPaused;
    const btn = document.getElementById("btnPause");
    const orb = document.getElementById("voiceOrb");
    if (isPaused) {
        btn.innerText = "▶️ Retomar";
        updateStatus("Em Pausa");
        orb.classList.add("opacity-50");
        if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
    } else {
        btn.innerText = "⏸️ Pausar";
        updateStatus("Ouvindo...");
        orb.classList.remove("opacity-50");
        startVAD();
    }
}

function endSession() {
    stopSessionHard();
    document.getElementById("btnInit").classList.remove("hidden");
    document.getElementById("activeControls").classList.add("hidden");
    updateStatus("Sessão Encerrada");
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
    if (el) el.innerHTML = `<span class="w-2 h-2 inline-block rounded-full bg-blue-600 animate-pulse"></span> ${txt}`;
    if (orb) {
        if (txt.includes("Ouvindo") || txt.includes("Falando")) {
            orb.className = "w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)] transition-all duration-500 scale-110 animate-pulse";
        } else if (txt.includes("Processando")) {
            orb.className = "w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all duration-1000 scale-100 rotate-180";
        } else {
            orb.className = "w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all duration-500 scale-100";
        }
    }
}

function appendLog(role, text, cls) {
    const log = document.getElementById("audioLog");
    if (!log) return;

    const isBot = cls === 'bot';
    const div = document.createElement("div");
    div.className = `flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`;

    div.innerHTML = `
        <div class="max-w-[80%] ${isBot ? 'bg-gray-100 text-gray-800 rounded-br-2xl rounded-tr-2xl rounded-bl-sm dark:bg-slate-800 dark:text-gray-200' : 'bg-blue-600 text-white rounded-bl-2xl rounded-tl-2xl rounded-br-sm'} p-3 shadow-sm">
            <p class="text-xs font-bold mb-1 opacity-70">${role}</p>
            <p class="text-sm">${text}</p>
        </div>
    `;

    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
