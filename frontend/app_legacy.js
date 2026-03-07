const API = "http://127.0.0.1:8000";

const tabText = document.getElementById("tabText");
const tabAudio = document.getElementById("tabAudio");
const panelText = document.getElementById("panelText");
const panelAudio = document.getElementById("panelAudio");

const statusEl = document.getElementById("status");
const sessionIdEl = document.getElementById("sessionId");
const langEl = document.getElementById("lang");

const textLog = document.getElementById("textLog");
const audioLog = document.getElementById("audioLog");

const textInput = document.getElementById("textInput");
const sendTextBtn = document.getElementById("sendText");

const startConversaBtn = document.getElementById("startConversa");
const startAudioBtn = document.getElementById("startAudio");
const pauseAudioBtn = document.getElementById("pauseAudio");
const endAudioBtn = document.getElementById("endAudio");
const clearTextBtn = document.getElementById("clearText");
const clearAudioBtn = document.getElementById("clearAudio");
const useStreamEl = document.getElementById("useStream");
const player = document.getElementById("player");

let activeMode = "text"; // "text" | "audio"
let sessionActive = false; // Controle de sessão ativa

// ---------- logs ----------
function appendText(role, msg) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<span class="${role === "Você" ? "me" : "bot"}">${role}:</span> ${escapeHtml(msg)}`;
  textLog.appendChild(div);
  textLog.scrollTop = textLog.scrollHeight;
}
function appendAudio(role, msg) {
  const div = document.createElement("div");
  div.className = "msg";
  div.innerHTML = `<span class="${role === "Você" ? "me" : "bot"}">${role}:</span> ${escapeHtml(msg)}`;
  audioLog.appendChild(div);
  audioLog.scrollTop = audioLog.scrollHeight;
}
function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}

function setStatus(s) { statusEl.textContent = s; }

// ---------- settings ----------
async function applySettings(output_mode) {
  const session_id = sessionIdEl.value.trim();
  const language = langEl.value;

  const res = await fetch(`${API}/v1/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ session_id, output_mode, language })
  });

  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

document.getElementById("apply").addEventListener("click", async () => {
  try {
    setStatus("aplicando...");
    await applySettings(activeMode === "audio" ? "audio" : "text");
    setStatus("pronto");
  } catch (e) {
    setStatus("erro");
    alert(e.message);
  }
});

// ---------- switch tabs ----------
function setActiveTab(mode) {
  activeMode = mode;

  if (mode === "text") {
    tabText.classList.add("active");
    tabAudio.classList.remove("active");
    panelText.classList.remove("hidden");
    panelAudio.classList.add("hidden");
  } else {
    tabAudio.classList.add("active");
    tabText.classList.remove("active");
    panelAudio.classList.remove("hidden");
    panelText.classList.add("hidden");
  }
}

tabText.addEventListener("click", async () => {
  // ao voltar para texto, encerra TUDO do áudio
  sessionActive = false;
  await endAudioHard();
  setActiveTab("text");
  setStatus("pronto");
  try { await applySettings("text"); } catch { }
});

tabAudio.addEventListener("click", async () => {
  setActiveTab("audio");
  setStatus("pronto");
  try { await applySettings("audio"); } catch { }
});

// ==============================
//  CHAT TEXTO (separado)
// ==============================
async function sendText() {
  const session_id = sessionIdEl.value.trim();
  const text = textInput.value.trim();
  if (!text) return;

  appendText("Você", text);
  textInput.value = "";
  setStatus("pensando...");

  const res = await fetch(`${API}/v1/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      session_id,
      message: { type: "text", text }
    })
  });

  if (!res.ok) {
    setStatus("erro");
    appendText("Bot", `Erro: ${await res.text()}`);
    return;
  }

  const data = await res.json();
  const reply = data.output?.text ?? "(sem texto)";
  appendText("Bot", reply);

  if (data.ui) {
    renderMenu(data.ui, "textLog");
  }

  setStatus("pronto");
}

sendTextBtn.addEventListener("click", sendText);
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendText();
});

clearTextBtn.addEventListener("click", () => {
  textLog.innerHTML = "";
});

clearAudioBtn.addEventListener("click", () => {
  audioLog.innerHTML = "";
});

// ==============================
//  CHAT ÁUDIO (separado)
// ==============================

let micStream = null;
let mediaRecorder = null;
let chunks = [];
let rafId = null;

let audioContext = null;
let analyser = null;
let dataArray = null;

let audioState = "idle"; // idle | recording | sending | responding | paused

const SILENCE_THRESHOLD = 0.020; // Aumentado para 0.020 para tolerar ruído de fundo
const SILENCE_STOP_MS = 3000; // Reduzido para 3s a pedido do usuário

function setAudioState(st) {
  audioState = st;

  // Reset visual classes
  startAudioBtn.classList.remove("btn-speaking", "btn-silence");
  startAudioBtn.innerText = "🎤 Falar";

  if (st === "idle") {
    // Estado inicial ou resetado
    setStatus("pronto");
    startConversaBtn.style.display = "inline-block";
    startAudioBtn.style.display = "none";
    pauseAudioBtn.style.display = "none";
    endAudioBtn.style.display = "none";

    startConversaBtn.disabled = false;
    return;
  }

  if (st === "session_started") {
    // Sessão iniciada, aguardando primeira fala
    setStatus("pronto (conversa iniciada)");
    startConversaBtn.style.display = "none";
    startAudioBtn.style.display = "inline-block";
    pauseAudioBtn.style.display = "inline-block";
    endAudioBtn.style.display = "inline-block";

    startAudioBtn.disabled = false;
    pauseAudioBtn.innerText = "⏸️ Pausar";
    pauseAudioBtn.disabled = true; // Só pode pausar se estiver gravando/respondendo? Não, pode pausar a "sessão"
    return;
  }

  if (st === "recording") {
    setStatus("gravando...");
    startConversaBtn.style.display = "none";
    startAudioBtn.style.display = "inline-block";
    pauseAudioBtn.style.display = "inline-block";
    endAudioBtn.style.display = "inline-block";

    // Botão Falar vira indicador de estado
    startAudioBtn.innerText = "🎤 Ouvindo...";
    startAudioBtn.disabled = false; // Permanece "clicável" ou apenas visual? User disse "fica verde escuro...". 
    // Vamos deixá-lo visualmente ativo. Se clicar, talvez force parar? Por enquanto, apenas visual.

    pauseAudioBtn.innerText = "⏸️ Pausar";
    pauseAudioBtn.disabled = false;
    return;
  }

  if (st === "sending" || st === "responding") {
    setStatus(st === "sending" ? "enviando..." : "respondendo...");
    startConversaBtn.style.display = "none";
    startAudioBtn.style.display = "inline-block";
    pauseAudioBtn.style.display = "inline-block";
    endAudioBtn.style.display = "inline-block";

    startAudioBtn.innerText = "⏳ Processando";
    startAudioBtn.disabled = true;
    pauseAudioBtn.disabled = false;
    return;
  }

  if (st === "paused") {
    setStatus("conversação pausada");
    startConversaBtn.style.display = "none";
    startAudioBtn.style.display = "inline-block";
    pauseAudioBtn.style.display = "inline-block";
    endAudioBtn.style.display = "inline-block";

    startAudioBtn.innerText = "▶️ Retomar";
    startAudioBtn.disabled = false;

    pauseAudioBtn.innerText = "▶️ Retomar"; // O botão de pausa também pode servir para retomar
    pauseAudioBtn.disabled = false;
    return;
  }
}

function getRecorderMime() {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "audio/webm";
}

async function ensureMic() {
  if (micStream) return;
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  dataArray = new Uint8Array(analyser.fftSize);

  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);
}

function stopDetector() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioContext) {
    try { audioContext.close(); } catch { }
    audioContext = null;
  }
  analyser = null;
  dataArray = null;
}

function stopPlayback() {
  try { player.pause(); } catch { }
  player.src = "";
}

function stopRecordingIfAny(forceAbort = false) {
  try {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      if (forceAbort) {
        // Remove o callback para não enviar o áudio
        mediaRecorder.onstop = null;
      }
      mediaRecorder.stop();
    }
  } catch { }
  mediaRecorder = null;
  chunks = [];
}

async function endAudioHard() {
  stopDetector();
  stopRecordingIfAny();
  stopPlayback();
  stopMic();
  setAudioState("idle");
}

async function startRecordingSegment() {
  await ensureMic();

  // Cria uma nova "bolha" de mensagem para esta fala
  appendAudio("Você", "(...)");

  chunks = [];
  const mime = getRecorderMime();
  mediaRecorder = new MediaRecorder(micStream, { mimeType: mime });

  let silenceMs = 0;
  let lastSpeechTime = Date.now(); // Inicializa com tempo atual para evitar estado inconsistente
  setAudioState("recording");

  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  mediaRecorder.onstop = async () => {
    stopDetector();
    setAudioState("sending");

    const blob = new Blob(chunks, { type: mime });
    chunks = [];

    try {
      await sendAudio(blob, mime);
    } catch (e) {
      appendAudio("Bot", "Erro: " + e.message);
      setAudioState("paused");
    }
  };

  function tick() {
    if (!analyser) return;
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    if (rms < SILENCE_THRESHOLD) silenceMs += 16;
    else silenceMs = 0;

    // Debug visual e Feedback nos Botões com Histerese
    const now = Date.now();
    if (rms > SILENCE_THRESHOLD) {
      lastSpeechTime = now; // Atualiza timestamp da última fala detectada
    }

    if (silenceMs % 50 < 10) {
      // Lógica de visualização
      // Se está falando OU (faz pouco tempo que parou de falar E ainda não deu timeout de silêncioVisual)
      // Usaremos 1500ms como "tempo de sustentação visual" para não ficar piscando
      const timeSinceSpeech = now - lastSpeechTime;

      if (rms > SILENCE_THRESHOLD || timeSinceSpeech < 1500) {
        // Estado: FALANDO (Verde Escuro)
        if (!startAudioBtn.classList.contains("btn-speaking")) {
          startAudioBtn.classList.add("btn-speaking");
          startAudioBtn.classList.remove("btn-silence");
          startAudioBtn.innerText = "🎤 Falando...";
        }
      } else {
        // Estado: OUVINDO (Verde Claro) - Apenas após 1.5s de silêncio
        if (!startAudioBtn.classList.contains("btn-silence")) {
          startAudioBtn.classList.add("btn-silence");
          startAudioBtn.classList.remove("btn-speaking");
          startAudioBtn.innerText = "👂 Ouvindo...";
        }
      }
    }

    if (silenceMs >= SILENCE_STOP_MS) {
      silenceMs = 0;
      if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  mediaRecorder.start();
  rafId = requestAnimationFrame(tick);
}

pauseAudioBtn.addEventListener("click", async () => {
  if (audioState === "recording") {
    // Pausar
    stopRecordingIfAny(true); // Aborta envio atual
    stopDetector();
    setAudioState("paused");
  } else if (audioState === "paused") {
    // Retomar
    // appendAudio("Você", "(retomando...)"); // Removido para evitar duplicidade com startRecordingSegment
    await startRecordingSegment();
  } else if (audioState === "session_started") {
    // Se estava apenas aguardando inicio, pausar não faz muito sentido, mas ok
    setAudioState("paused");
  }
});

endAudioBtn.addEventListener("click", async () => {
  sessionActive = false;
  await endAudioHard();
  // Limpa log? Talvez não. 
  // Volta ao estado inicial da aba
  setAudioState("idle");
});

startConversaBtn.addEventListener("click", () => {
  sessionActive = true;
  setAudioState("session_started");
  appendAudio("System", "Conversa iniciada. Clique em 'Falar' para começar.");
});

startAudioBtn.addEventListener("click", async () => {
  if (activeMode !== "audio") return;

  if (audioState === "paused") {
    // Retomar
    await startRecordingSegment();
    return;
  }

  if (audioState === "session_started" || audioState === "idle") {
    await startRecordingSegment();
  }
});

// ---------- envio áudio ----------
async function blobToBase64(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64ToBlob(b64, mime) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

async function playAudio(audio) {
  const blobOut = b64ToBlob(audio.base64, audio.mime || "audio/mpeg");
  const url = URL.createObjectURL(blobOut);
  player.src = url;

  setAudioState("responding");
  await player.play();
  await new Promise(resolve => player.onended = resolve);

  // Fim da resposta: se sessão ativa e não pausada, volta a ouvir
  if (sessionActive && audioState !== "paused") {
    await startRecordingSegment();
  } else {
    setAudioState("session_started"); // Ou paused? Se acabou, volta para aguardar fala.
    // Melhor: Se não está pausado, mas sessionActive é true, volta a ouvir.
    // Se sessionActive for false (encerrou), vai pra idle.
    if (!sessionActive) setAudioState("idle");
  }
}

async function sendAudio(blob, mime) {
  const session_id = sessionIdEl.value.trim();
  const base64 = await blobToBase64(blob);
  const payload = { session_id, message: { type: "audio", audio: { mime, base64 } } };

  // Agora forçamos o uso do endpoint padrão (sem stream) sempre
  const res = await fetch(`${API}/v1/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(await res.text());

  setStatus("respondendo...");
  const data = await res.json();

  if (data.error) {
    appendAudio("Bot", `Erro: ${data.error}`);
    setAudioState("paused");
    return;
  }

  // 1. Atualiza texto do usuário (transcrição)
  const userText = data.output?.user_text;
  if (userText) {
    // Procura a última msg do usuário para atualizar
    const userMsgs = audioLog.querySelectorAll('.msg');
    const lastUserDiv = Array.from(userMsgs).reverse().find(div => div.innerHTML.includes('Você'));
    if (lastUserDiv) {
      lastUserDiv.innerHTML = `<span class="me">Você:</span> ${escapeHtml(userText)}`;
    } else {
      // Fallback: se não achar a bolha anterior, cria uma nova
      appendAudio("Você", userText);
    }
  }

  // 2. Mostra resposta do Bot
  const reply = data.output?.text || data.text || "(sem texto)";
  const audioOut = data.output?.audio || data.audio;

  appendAudio("Bot", reply);

  if (data.ui) {
    renderMenu(data.ui, "audioLog");
  }

  if (audioOut && audioOut.base64) {
    await playAudio(audioOut);
  } else {
    setAudioState("paused");
  }
}

// ---------- UI / Menu Parsing ----------
function renderMenu(menu, targetLogId) {
  const targetLog = document.getElementById(targetLogId);
  const div = document.createElement("div");
  div.className = "menu-container";

  // Title
  if (menu.title) {
    const h4 = document.createElement("h4");
    h4.innerText = menu.title;
    div.appendChild(h4);
  }

  // Items
  const btnContainer = document.createElement("div");
  btnContainer.className = "menu-items";

  (menu.items || []).forEach(item => {
    const btn = document.createElement("button");
    btn.innerText = item.label;
    btn.className = "menu-btn";

    // Active/Inactive state from backend
    if (item.active === true) {
      btn.classList.add("btn-active"); // Green
    } else if (item.active === false) {
      btn.classList.add("btn-inactive");
    } else {
      // Se nao vier definido, assumimos inactive? Ou neutro?
      // O usuario pediu "verde para ativo, vermelho para inativo", entao forçamos vermelho se não for ativo.
      btn.classList.add("btn-inactive");
    }

    btn.onclick = () => sendUIAction(item.id);
    btnContainer.appendChild(btn);
  });

  div.appendChild(btnContainer);
  targetLog.appendChild(div);
  targetLog.scrollTop = targetLog.scrollHeight;
}

async function sendUIAction(actionId) {
  const session_id = sessionIdEl.value.trim();
  // Envia ação como mensagem especial
  // endpoint padrão suporta ui_action? v1_message -> handle_message -> handle_action

  // Mostra feedback visual? 
  // appendText("Você", `[Ação: ${actionId}]`);

  const res = await fetch(`${API}/v1/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      session_id,
      message: { type: "text", text: "" }, // vazio
      ui_action: { action_id: actionId }
    })
  });

  if (!res.ok) {
    alert("Erro ao enviar ação: " + await res.text());
    return;
  }

  const data = await res.json();
  // Processa resposta (pode ser nova UI ou texto)
  const reply = data.output?.text || "(ok)";

  if (activeMode === "text") {
    appendText("Bot", reply);
    if (data.ui) renderMenu(data.ui, "textLog");
  } else {
    appendAudio("Bot", reply);
    if (data.ui) renderMenu(data.ui, "audioLog");

    if (data.output?.audio?.base64) {
      await playAudio(data.output.audio);
    }
  }
}

const tabTranslator = document.getElementById("tabTranslator");
const panelTranslator = document.getElementById("panelTranslator");

// Translator Elements
const transSrc = document.getElementById("transSrc");
const transTgt = document.getElementById("transTgt");
const swapLangBtn = document.getElementById("swapLang");
const transInput = document.getElementById("transInput");
const transResult = document.getElementById("transResult");
const btnTranslate = document.getElementById("btnTranslate");
const playSrcBtn = document.getElementById("playSrc");
const playTgtBtn = document.getElementById("playTgt");
const copyTgtBtn = document.getElementById("copyTgt");
const charCount = document.getElementById("charCount");

let audioSrcCache = null;
let audioTgtCache = null;

// ==============================
//  TABS & NAVIGATION
// ==============================
// A tab já existe no HTML estático, apenas adicionamos o listener
const tabTranslatorEl = document.getElementById("tabTranslator");

tabTranslatorEl.addEventListener("click", () => {
  setActiveTab("translator");
});


function setActiveTab(mode) {
  activeMode = mode;
  sessionActive = false; // Reseta sessão de audio se sair
  endAudioHard(); // Garante que audio pare
  stopInterpHard(); // Para inteprete 1
  stopAutoHard(); // Para interprete 2

  // Reset visual
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p => p.classList.add("hidden"));

  if (mode === "text") {
    tabText.classList.add("active");
    panelText.classList.remove("hidden");
  } else if (mode === "audio") {
    tabAudio.classList.add("active");
    panelAudio.classList.remove("hidden");
  } else if (mode === "translator") {
    document.getElementById("tabTranslator").classList.add("active");
    panelTranslator.classList.remove("hidden");
  } else if (mode === "interpreter") {
    document.getElementById("tabInterpreter").classList.add("active");
    document.getElementById("panelInterpreter").classList.remove("hidden");
  } else if (mode === "interpreterAuto") {
    document.getElementById("tabInterpreterAuto").classList.add("active");
    document.getElementById("panelInterpreterAuto").classList.remove("hidden");
  }
}

// ==============================
//  TRADUTOR LOGIC
// ==============================

// Char Count & Limit
transInput.addEventListener("input", () => {
  const maxLength = 500;
  let currentLength = transInput.value.length;

  if (currentLength > maxLength) {
    transInput.value = transInput.value.substring(0, maxLength);
    currentLength = maxLength;
    // Show visual warning
    charCount.classList.add("limit-error");
    // Mensagem opcional ("Caracteres excedentes" - user asked)
    charCount.innerText = `${currentLength}/${maxLength} (Máximo atingido!)`;
  } else {
    charCount.classList.remove("limit-error");
    charCount.innerText = `${currentLength}/${maxLength}`;
  }
});

// Clear Text
const clearTransInputBtn = document.getElementById("clearTransInput");
if (clearTransInputBtn) {
  clearTransInputBtn.addEventListener("click", () => {
    transInput.value = "";
    transResult.innerText = "";
    charCount.innerText = "0/500";
    charCount.classList.remove("limit-error");
    stopCurrentAudio();
    audioSrcCache = null;
    audioTgtCache = null;
  });
}

// Swap Languages
swapLangBtn.addEventListener("click", () => {
  const temp = transSrc.value;
  transSrc.value = transTgt.value;
  transTgt.value = temp;

  // Swap text too if exists? Maybe just inputs
  const srcText = transInput.value;
  const tgtText = transResult.innerText;

  if (tgtText && tgtText !== "Traduzindo..." && tgtText !== "Erro na tradução.") {
    transInput.value = tgtText;
    transResult.innerText = srcText;
    // Invalidate audio cache
    audioSrcCache = null;
    audioTgtCache = null;
  }
});

// Translate
btnTranslate.addEventListener("click", async () => {
  const text = transInput.value.trim();
  if (!text) return;

  transResult.innerText = "Traduzindo...";
  btnTranslate.disabled = true;
  audioSrcCache = null;
  audioTgtCache = null;
  stopCurrentAudio(); // Para qualquer audio tocando

  try {
    const res = await fetch(`${API}/v1/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_lang: transSrc.value,
        target_lang: transTgt.value,
        text: text
      })
    });

    const data = await res.json();

    if (data.error) {
      transResult.innerText = "Erro: " + data.error;
    } else {
      transResult.innerText = data.translated_text;
      audioSrcCache = data.audio_source;
      audioTgtCache = data.audio_target;
    }
  } catch (e) {
    transResult.innerText = "Erro na requisição.";
    console.error(e);
  } finally {
    btnTranslate.disabled = false;
  }
});

// Audio Logic with Toggle (Play/Stop)
let currentTranslatorAudio = null;
let currentPlayingBtn = null; // Para voltar o ícone ao normal

function stopCurrentAudio() {
  if (currentTranslatorAudio) {
    currentTranslatorAudio.pause();
    currentTranslatorAudio.currentTime = 0;
    currentTranslatorAudio = null;
  }
  if (currentPlayingBtn) {
    currentPlayingBtn.innerText = "🔊"; // Reset icon
    currentPlayingBtn = null;
  }
}

async function playB64Toggle(b64, btn) {
  if (!b64) return;

  // Se clicou no mesmo botão e está tocando -> Parar
  if (currentPlayingBtn === btn && currentTranslatorAudio && !currentTranslatorAudio.paused) {
    stopCurrentAudio();
    return;
  }

  // Se tocar outro, para o anterior
  stopCurrentAudio();

  const blob = b64ToBlob(b64, "audio/mpeg");
  const url = URL.createObjectURL(blob);

  currentTranslatorAudio = new Audio(url);
  currentPlayingBtn = btn;
  btn.innerText = "⏹️"; // Stop icon

  currentTranslatorAudio.onended = () => {
    stopCurrentAudio();
  };

  try {
    await currentTranslatorAudio.play();
  } catch (err) {
    console.error("Erro ao tocar audio tradutor:", err);
    stopCurrentAudio();
  }
}

playSrcBtn.addEventListener("click", () => {
  if (audioSrcCache) {
    playB64Toggle(audioSrcCache, playSrcBtn);
  } else if (transInput.value) {
    alert("Áudio original não disponível (traduza novamente).");
  }
});

playTgtBtn.addEventListener("click", () => {
  if (audioTgtCache) {
    playB64Toggle(audioTgtCache, playTgtBtn);
  }
});

copyTgtBtn.addEventListener("click", () => {
  if (transResult.innerText) {
    navigator.clipboard.writeText(transResult.innerText);
    const original = copyTgtBtn.innerText;
    copyTgtBtn.innerText = "✅";
    setTimeout(() => copyTgtBtn.innerText = original, 1000);
  }
});

// ==============================
//  INTERPRETER LOGIC
// ==============================
// ==============================
//  INTERPRETER LOGIC (REPLACED)
// ==============================
// ==============================
//  INTERPRETER LOGIC (VAD & REFINED)
// ==============================
const tabInterpreterEl = document.getElementById("tabInterpreter");
tabInterpreterEl.addEventListener("click", () => setActiveTab("interpreter"));

const interpLangA = document.getElementById("interpLangA");
const interpLangB = document.getElementById("interpLangB");
const interpSwapBtn = document.getElementById("interpSwap"); // Pode não existir no novo layout ou ser visual
const btnInterpTalkA = document.getElementById("btnInterpTalkA");
const btnInterpStopA = document.getElementById("btnInterpStopA"); // Novo
const btnInterpPlayA = document.getElementById("btnInterpPlayA"); // Novo
const btnInterpTalkB = document.getElementById("btnInterpTalkB");
const btnInterpStopB = document.getElementById("btnInterpStopB"); // Novo
const btnInterpPlayB = document.getElementById("btnInterpPlayB");
const btnClearInterp = document.getElementById("btnClearInterp");

// Inputs/Outputs (divs acting as text display)
const interpResultA = document.getElementById("interpResultA");
const interpResultB = document.getElementById("interpResultB");

let interpMediaRecorder = null;
let interpAudioChunks = [];
let interpAudioCacheA = null; // Cache para audio Lado A
let interpAudioCacheB = null; // Cache para audio Lado B
let interpRafId = null;
let interpAudioContext = null;
let interpAnalyser = null;
let interpDataArray = null;
let interpStream = null;

const INTERP_SILENCE_THRESHOLD = 0.020;
const INTERP_SILENCE_STOP_MS = 2000; // 2 segundos

function resetInterpUI() {
  btnInterpTalkA.style.display = "inline-block";
  btnInterpStopA.style.display = "none";
  btnInterpTalkA.classList.remove("recording");
  btnInterpTalkA.innerText = "🎤 Falar A";
  btnInterpTalkA.style.background = "";

  btnInterpTalkB.style.display = "inline-block";
  btnInterpStopB.style.display = "none";
  btnInterpTalkB.classList.remove("recording");
  btnInterpTalkB.innerText = "🎤 Falar B";
  btnInterpTalkB.style.background = "";
}

async function stopInterpHard() {
  if (interpRafId) cancelAnimationFrame(interpRafId);
  interpRafId = null;

  if (interpMediaRecorder && interpMediaRecorder.state !== "inactive") {
    interpMediaRecorder.stop();
  }

  if (interpStream) {
    interpStream.getTracks().forEach(t => t.stop());
    interpStream = null;
  }

  if (interpAudioContext) {
    try { await interpAudioContext.close(); } catch { }
    interpAudioContext = null;
  }
  interpAnalyser = null;
  resetInterpUI();
}

async function handleInterpVAD(btnTalk, btnStop, sourceLang, targetLang, resultDivSource, resultDivTarget, isSourceA) {
  // Se já estiver gravando, forçar parada (ou ignorar clique se o btnTalk estiver 'escondido')
  // Mas vamos garantir reset
  await stopInterpHard();
  stopCurrentAudio(); // Para qualquer player tocando

  try {
    interpStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Config AudioContext para VAD
    interpAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    interpAnalyser = interpAudioContext.createAnalyser();
    interpAnalyser.fftSize = 2048;
    interpDataArray = new Uint8Array(interpAnalyser.fftSize);
    const source = interpAudioContext.createMediaStreamSource(interpStream);
    source.connect(interpAnalyser);

    interpMediaRecorder = new MediaRecorder(interpStream, { mimeType: 'audio/webm' });
    interpAudioChunks = [];

    interpMediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) interpAudioChunks.push(event.data);
    };

    let silenceMs = 0;

    // UI Update: Mostrar Stop, Esconder Talk? Ou mudar Talk?
    // User pediu: "Separar botão falar do botão pausar"
    btnTalk.style.display = "none";
    btnStop.style.display = "inline-block";

    // Podemos usar o btnStop para indicar status também, ou usar um label separado.
    // O user disse: "botao fica verde, com label Gravando". Vamos usar o btnStop ou um fake btnTalk?
    // Vamos usar o btnStop visualmente como "Gravando..." e clicável para "Parar Agora".
    btnStop.innerText = "Gravando... (Fale)";
    btnStop.classList.remove("secondary-btn");
    btnStop.classList.add("recording"); // Estilo verde? (Se houver CSS)
    btnStop.style.background = "#22c55e"; // Verde forte
    btnStop.style.color = "white";

    interpMediaRecorder.onstop = async () => {
      if (interpRafId) cancelAnimationFrame(interpRafId);

      const audioBlob = new Blob(interpAudioChunks, { type: 'audio/webm' });
      const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });

      // UI Feedback
      resetInterpUI(); // Volta botões ao normal
      resultDivSource.innerText = "Processando...";
      resultDivTarget.innerText = "...";

      if (interpAudioContext) { try { await interpAudioContext.close(); } catch { } interpAudioContext = null; }
      if (interpStream) { interpStream.getTracks().forEach(t => t.stop()); interpStream = null; }

      // Send to Backend
      const formData = new FormData();
      formData.append("source_lang", sourceLang);
      formData.append("target_lang", targetLang);
      formData.append("file", file);
      try {
        const res = await fetch(`${API}/v1/interpret`, {
          method: "POST",
          body: formData
        });

        // Debug
        if (!res.ok) {
          const errText = await res.text();
          console.error("API Error:", res.status, errText);
          try {
            const errJson = JSON.parse(errText);
            const detail = errJson.detail ? JSON.stringify(errJson.detail) : errText;
            resultDivSource.innerText = `Erro API ${res.status}: ${detail}`;
          } catch {
            resultDivSource.innerText = `Erro API ${res.status}: ${errText}`;
          }
          return;
        }

        const data = await res.json();

        if (data.error) {
          resultDivSource.innerText = "Erro: " + data.error;
        } else {
          resultDivSource.innerText = data.source_text || "(sem fala)";
          resultDivTarget.innerText = data.target_text || "(sem tradução)";

          if (data.target_audio) {
            if (isSourceA) {
              interpAudioCacheB = data.target_audio;
              playB64Toggle(data.target_audio, btnInterpPlayB);
            } else {
              interpAudioCacheA = data.target_audio;
              playB64Toggle(data.target_audio, btnInterpPlayA);
            }
          }
        }
      } catch (err) {
        console.error(err);
        resultDivSource.innerText = "Erro de conexão";
      }
    };

    // VAD Loop
    function tick() {
      if (!interpAnalyser) return;
      interpAnalyser.getByteTimeDomainData(interpDataArray);

      let sum = 0;
      for (let i = 0; i < interpDataArray.length; i++) {
        const v = (interpDataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / interpDataArray.length);

      if (rms < INTERP_SILENCE_THRESHOLD) {
        silenceMs += 16;
      } else {
        silenceMs = 0;
        // Visual feedback: Falando
        btnStop.innerText = "Gravando... 🗣️";
      }

      if (silenceMs >= INTERP_SILENCE_STOP_MS) {
        // Auto Stop
        if (interpMediaRecorder && interpMediaRecorder.state === "recording") {
          interpMediaRecorder.stop();
        }
        return;
      }

      interpRafId = requestAnimationFrame(tick);
    }

    interpMediaRecorder.start();
    interpRafId = requestAnimationFrame(tick);

  } catch (err) {
    console.error("Erro mic:", err);
    alert("Erro ao acessar microfone.");
    resetInterpUI();
  }
}

// Event Listeners
btnInterpTalkA.addEventListener("click", () => {
  handleInterpVAD(btnInterpTalkA, btnInterpStopA, interpLangA.value, interpLangB.value, interpResultA, interpResultB, true);
});

btnInterpStopA.addEventListener("click", async () => {
  // Parar manual deve processar o que tem
  if (interpMediaRecorder && interpMediaRecorder.state === "recording") {
    interpMediaRecorder.stop();
  } else {
    await stopInterpHard();
  }
});

btnInterpTalkB.addEventListener("click", () => {
  handleInterpVAD(btnInterpTalkB, btnInterpStopB, interpLangB.value, interpLangA.value, interpResultB, interpResultA, false);
});

btnInterpStopB.addEventListener("click", async () => {
  if (interpMediaRecorder && interpMediaRecorder.state === "recording") {
    interpMediaRecorder.stop();
  } else {
    await stopInterpHard();
  }
});

// Players
if (btnInterpPlayA) {
  btnInterpPlayA.addEventListener("click", () => {
    if (interpAudioCacheA) playB64Toggle(interpAudioCacheA, btnInterpPlayA);
  });
}
btnInterpPlayB.addEventListener("click", () => {
  if (interpAudioCacheB) playB64Toggle(interpAudioCacheB, btnInterpPlayB);
});

btnClearInterp.addEventListener("click", () => {
  interpResultA.innerText = "";
  interpResultB.innerText = "";
  interpAudioCacheA = null;
  interpAudioCacheB = null;
  stopCurrentAudio();
  stopInterpHard();
});


// init states (updated)
setActiveTab("text");
setAudioState("idle");
setStatus("pronto");
// ==============================
//  INTERPRETER 2 (AUTO) LOGIC
// ==============================
const tabInterpreterAutoEl = document.getElementById("tabInterpreterAuto");
if (tabInterpreterAutoEl) {
  tabInterpreterAutoEl.addEventListener("click", () => setActiveTab("interpreterAuto"));
}

const btnAutoTalk = document.getElementById("btnAutoTalk");
const btnClearAuto = document.getElementById("btnClearAuto");
const autoResult = document.getElementById("autoResult");
const autoStatusLabel = document.getElementById("autoStatusLabel");
const autoLangA = document.getElementById("autoLangA");
const autoLangB = document.getElementById("autoLangB");

let autoMediaRecorder = null;
let autoAudioChunks = [];
let autoAudioContext = null;
let autoAnalyser = null;
let autoDataArray = null;
let autoStream = null;
let autoRafId = null;
let isAutoRecording = false;

// Clear
if (btnClearAuto) {
  btnClearAuto.addEventListener("click", () => {
    autoResult.innerHTML = '<p style="color:var(--text-muted); text-align:center; margin-top:50px;">A conversa aparecerá aqui...</p>';
    stopCurrentAudio();
  });
}

// Button Click
if (btnAutoTalk) {
  btnAutoTalk.addEventListener("click", () => {
    if (isAutoRecording) {
      // Stop manually
      stopAutoHard();
    } else {
      // Start
      startAutoVAD();
    }
  });
}

async function stopAutoHard() {
  isAutoRecording = false;
  if (autoRafId) cancelAnimationFrame(autoRafId);
  autoRafId = null;

  if (autoMediaRecorder && autoMediaRecorder.state !== "inactive") {
    autoMediaRecorder.stop();
  }

  if (autoStream) {
    autoStream.getTracks().forEach(track => track.stop());
    autoStream = null;
  }

  if (autoAudioContext) {
    try { await autoAudioContext.close(); } catch { }
    autoAudioContext = null;
  }

  resetAutoUI();
}

function resetAutoUI() {
  btnAutoTalk.classList.remove("recording");
  btnAutoTalk.style.background = ""; // Reset
  btnAutoTalk.style.boxShadow = "0 6px 15px rgba(0,0,0,0.3)";
  autoStatusLabel.innerText = "Toque para falar";
  autoStatusLabel.style.color = "var(--text-muted)";
}

async function startAutoVAD() {
  stopCurrentAudio(); // Param any audio playing

  try {
    autoStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    autoAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    autoAnalyser = autoAudioContext.createAnalyser();
    autoAnalyser.fftSize = 2048;
    autoDataArray = new Uint8Array(autoAnalyser.fftSize);
    const source = autoAudioContext.createMediaStreamSource(autoStream);
    source.connect(autoAnalyser);

    autoMediaRecorder = new MediaRecorder(autoStream, { mimeType: 'audio/webm' });
    autoAudioChunks = [];

    autoMediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) autoAudioChunks.push(e.data);
    };

    autoMediaRecorder.onstop = async () => {
      handleAutoRecordingStop();
    };

    // UI Feedback
    isAutoRecording = true;
    btnAutoTalk.classList.add("recording");
    btnAutoTalk.style.background = "#22c55e"; // Green
    btnAutoTalk.style.boxShadow = "0 0 20px rgba(34, 197, 94, 0.6)";
    autoStatusLabel.innerText = "Ouvindo...";
    autoStatusLabel.style.color = "#22c55e";

    // VAD Loop
    let silenceMs = 0;
    const SILENCE_LIMIT = 1500; // 1.5s for faster turnaround? User asked for 2s before? Let's use 1.5s as it matches "quick conversation". Or 2s per user preference. Let's stick to 2s to be safe or 1.5s. Let's use 1500ms for "Auto" mode to be snappy.

    function tick() {
      if (!autoAnalyser || !isAutoRecording) return;

      autoAnalyser.getByteTimeDomainData(autoDataArray);
      let sum = 0;
      for (let i = 0; i < autoDataArray.length; i++) {
        const v = (autoDataArray[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / autoDataArray.length);

      if (rms < 0.02) { // Threshold
        silenceMs += 16;
      } else {
        silenceMs = 0;
        autoStatusLabel.innerText = "Detectando voz... 🗣️";
      }

      if (silenceMs > SILENCE_LIMIT) {
        stopAutoHard(); // This triggers onstop
        return;
      }

      autoRafId = requestAnimationFrame(tick);
    }

    autoMediaRecorder.start();
    autoRafId = requestAnimationFrame(tick);

  } catch (err) {
    console.error("Auto Mic Error:", err);
    alert("Erro ao acessar microfone");
    resetAutoUI();
  }
}

async function handleAutoRecordingStop() {
  // Show spinner or processing state
  autoStatusLabel.innerText = "Processando...";
  autoStatusLabel.style.color = "#eab308"; // Yellow
  btnAutoTalk.style.background = "#eab308";

  const audioBlob = new Blob(autoAudioChunks, { type: 'audio/webm' });
  const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });

  const formData = new FormData();
  formData.append("source_lang_a", autoLangA.value);
  formData.append("source_lang_b", autoLangB.value);
  formData.append("file", file);

  try {
    const res = await fetch(`${API}/v1/interpret-auto`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("API Error", err);
      appendAutoMessage("Erro", `Erro na API: ${res.status}`, null, true);
      resetAutoUI();
      return;
    }

    const data = await res.json();

    if (data.error) {
      appendAutoMessage("Erro", data.error, null, true);
    } else {
      // Success
      // detected_language might be 'pt' or 'en'
      const fromLang = data.detected_language || "?";
      const isFromA = (fromLang === autoLangA.value);
      const sideLabel = isFromA ? "Lado A" : "Lado B"; // Or use Flag logic if we had it

      appendAutoMessage(
        `${sideLabel} (${fromLang.toUpperCase()})`,
        data.source_text,
        data.target_text,
        false,
        data.target_audio
      );

      if (data.target_audio) {
        const audio = new Audio("data:audio/mp3;base64," + data.target_audio);
        currentAudio = audio;
        audio.play();
      }
    }
  } catch (err) {
    console.error("Fetch Error", err);
    appendAutoMessage("Erro", "Falha de conexão", null, true);
  }

  resetAutoUI();
}

function appendAutoMessage(sender, text, translation, isError, audioB64) {
  if (autoResult.innerHTML.includes("A conversa aparecerá aqui")) {
    autoResult.innerHTML = "";
  }

  // Create Message Element
  const msgDiv = document.createElement("div");
  msgDiv.style.marginBottom = "15px";
  msgDiv.style.padding = "10px";
  msgDiv.style.borderRadius = "8px";
  msgDiv.style.background = isError ? "#fee2e2" : "var(--bg-card)";
  msgDiv.style.border = "1px solid var(--border)";

  let html = `<div style="font-weight:bold; color:var(--text); font-size:0.85rem; margin-bottom:4px;">${sender}</div>`;
  html += `<div style="color:var(--text);">${text}</div>`;

  if (translation) {
    html += `<div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--border); color:var(--primary); font-weight:500;">
           ${translation}
        </div>`;
  }

  msgDiv.innerHTML = html;

  // Play button specific for this message?
  if (audioB64) {
    const playBtn = document.createElement("button");
    playBtn.innerHTML = "🔊";
    playBtn.className = "icon-btn";
    playBtn.style.float = "right";
    playBtn.style.marginTop = "-20px";
    playBtn.onclick = () => playB64Toggle(audioB64, playBtn); // Reuse playB64Toggle if possible, or simple play
    msgDiv.insertBefore(playBtn, msgDiv.firstChild);
  }

  autoResult.appendChild(msgDiv);
  autoResult.scrollTop = autoResult.scrollHeight;
}
