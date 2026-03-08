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
        <div class="max-w-4xl mx-auto space-y-6">
            <div class="mb-4 text-center md:text-left">
                <p class="text-sm text-gray-600 dark:text-gray-400">Tradução e voz em tempo real para diálogos rápidos.</p>
            </div>

            <div class="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm dark:bg-slate-900 dark:border-gray-700">
                <div class="flex items-center justify-center gap-6 mb-8 bg-gray-50 dark:bg-black/20 p-4 rounded-2xl">
                    <select id="langA" class="py-2 px-3 border-transparent rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 dark:text-white focus:ring-blue-500">
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                    </select>
                    <span class="text-gray-400">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                    </span>
                    <select id="langB" class="py-2 px-3 border-transparent rounded-lg text-sm font-semibold bg-white dark:bg-slate-800 dark:text-white focus:ring-blue-500">
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                    </select>
                </div>
                
                <div class="grid md:grid-cols-2 gap-8 relative">
                    <div class="absolute inset-y-0 left-1/2 w-px bg-gray-100 dark:bg-gray-800 hidden md:block"></div>
                    
                    <!-- Side A -->
                    <div class="flex flex-col items-center text-center space-y-4">
                        <div class="flex items-center gap-2 group w-full justify-center">
                            <h4 class="text-xs font-bold uppercase tracking-widest text-gray-400">Pessoa A</h4>
                            <button id="clearResA" class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                                <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                        <div id="resA" class="w-full min-h-[120px] p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-gray-800 dark:bg-blue-900/10 dark:border-blue-900/20 dark:text-gray-200 italic flex items-center justify-center">
                            Aguardando voz...
                        </div>
                        <div class="flex flex-col items-center">
                            <button id="btnTalkA" class="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-90 transition-all">
                                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                            </button>
                            <button id="btnStopA" class="hidden w-16 h-16 rounded-full bg-red-600 text-white items-center justify-center animate-pulse">
                                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Side B -->
                    <div class="flex flex-col items-center text-center space-y-4">
                        <div class="flex items-center gap-2 group w-full justify-center">
                            <h4 class="text-xs font-bold uppercase tracking-widest text-gray-400">Pessoa B</h4>
                            <button id="clearResB" class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all">
                                <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                        </div>
                        <div id="resB" class="w-full min-h-[120px] p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-gray-800 dark:bg-emerald-900/10 dark:border-emerald-900/20 dark:text-gray-200 italic flex items-center justify-center">
                            Aguardando voz...
                        </div>
                        <div class="flex flex-col items-center">
                            <button id="btnTalkB" class="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:bg-emerald-700 active:scale-90 transition-all">
                                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                            </button>
                            <button id="btnStopB" class="hidden w-16 h-16 rounded-full bg-red-600 text-white items-center justify-center animate-pulse">
                                <svg class="w-7 h-7" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    parent.appendChild(container);

    setupListener("btnTalkA", "btnStopA", "langA", "langB", true);
    setupListener("btnTalkB", "btnStopB", "langB", "langA", false);

    document.getElementById("clearResA").onclick = () => {
        document.getElementById("resA").innerText = "Aguardando voz...";
    };
    document.getElementById("clearResB").onclick = () => {
        document.getElementById("resB").innerText = "Aguardando voz...";
    };
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
