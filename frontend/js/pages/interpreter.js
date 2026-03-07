// web/js/pages/interpreter.js
// Simplified port of interpreter logic
import { apiCall } from "../api.js";
import { showToast } from "../ui/toast.js";

let container = null;
let mediaRecorder = null;
let stream = null;
let chunks = [];

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-interp";
    container.innerHTML = `
        <h2>Intérprete</h2>
        <div class="trans-controls">
            <select id="langA"><option value="pt">Português</option><option value="en">English</option></select>
            <span>↔️</span>
            <select id="langB"><option value="en">English</option><option value="pt">Português</option></select>
        </div>
        
        <div class="interp-grid">
            <div class="side-a">
                <h4>Lado A</h4>
                <div id="resA" class="res-box"></div>
                <button id="btnTalkA" class="btn-rec">🎤 Falar A</button>
                <button id="btnStopA" class="btn-stop hidden">⏹️ Parar</button>
            </div>
            <div class="side-b">
                <h4>Lado B</h4>
                <div id="resB" class="res-box"></div>
                <button id="btnTalkB" class="btn-rec">🎤 Falar B</button>
                <button id="btnStopB" class="btn-stop hidden">⏹️ Parar</button>
            </div>
        </div>
    `;
    parent.appendChild(container);

    setupListener("btnTalkA", "btnStopA", "langA", "langB", true);
    setupListener("btnTalkB", "btnStopB", "langB", "langA", false);
}

export function unmount() {
    stopHardware();
    if (container) container.remove();
}

function setupListener(btnTalkId, btnStopId, selSrc, selTgt, isSideA) {
    const btnTalk = document.getElementById(btnTalkId);
    const btnStop = document.getElementById(btnStopId);

    btnTalk.onclick = async () => {
        const srcLang = document.getElementById(selSrc).value;
        const tgtLang = document.getElementById(selTgt).value;
        await startRecording(btnTalk, btnStop, srcLang, tgtLang, isSideA);
    };

    btnStop.onclick = () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
    };
}

async function startRecording(btnTalk, btnStop, srcLang, tgtLang, isSideA) {
    stopHardware(); // Ensure clean start

    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        chunks = [];

        mediaRecorder.ondataavailable = e => chunks.push(e.data);

        mediaRecorder.onstop = async () => {
            btnTalk.classList.remove("hidden");
            btnStop.classList.add("hidden");

            const blob = new Blob(chunks, { type: 'audio/webm' });
            processAudio(blob, srcLang, tgtLang, isSideA);
            stopHardware();
        };

        mediaRecorder.start();
        btnTalk.classList.add("hidden");
        btnStop.classList.remove("hidden");

    } catch (e) {
        showToast("Erro Mic: " + e.message, "err");
    }
}

function stopHardware() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

async function processAudio(blob, src, tgt, isSideA) {
    const targetBox = document.getElementById(isSideA ? "resA" : "resB");
    targetBox.innerText = "Processando...";

    const fd = new FormData();
    fd.append("source_lang", src);
    fd.append("target_lang", tgt);
    fd.append("file", new File([blob], "rec.webm"));

    try {
        const res = await apiCall("/v1/interpret", "POST", fd);
        targetBox.innerText = `${res.source_text} \n⬇️\n ${res.target_text}`;

        if (res.target_audio) {
            new Audio("data:audio/mp3;base64," + res.target_audio).play();
        }
    } catch (e) {
        targetBox.innerText = "Erro: " + e.message;
    }
}
