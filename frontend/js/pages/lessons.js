// web/js/pages/lessons.js
import { apiCall } from "../api.js";
import { state } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;
let currentLessonId = null;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "page-lessons";
    parent.appendChild(container);

    // Initial State: Catalog
    loadCatalog();
}

export function unmount() {
    if (currentLessonId) {
        // Opcional: Avisar user ou parar lição no backend?
        // Por enquanto apenas limpamos a UI. O backend mantem estado até /stop.
    }
    if (container) container.remove();
}

async function loadCatalog() {
    container.innerHTML = `<h3>Catálogo de Lições</h3><p>Carregando...</p>`;
    try {
        const [list, rec] = await Promise.all([
            apiCall(`/v1/lessons?user_id=${state.sessionId}`),
            apiCall(`/v1/recommendations?user_id=${state.sessionId}`)
        ]);
        renderCatalog(list, rec);
    } catch (e) {
        container.innerHTML = `<p class="error">Erro ao carregar catálogo: ${e.message}</p>`;
    }
}

function renderCatalog(data, rec) {
    container.innerHTML = `<h3>Catálogo de Lições</h3>`;

    // Recommendation Block
    if (rec && rec.recommended_lesson) {
        const r = rec.recommended_lesson;
        const r_id = r.lesson_id || r.id || r.filename;

        const recDiv = document.createElement("div");
        recDiv.className = "recommendation-box";
        recDiv.innerHTML = `
            <div class="rec-header">⭐ Recomendado para você</div>
            <div class="rec-body">
                <h4>${r.title}</h4>
                <p>${r.objective}</p>
                <div class="rec-reason">💡 ${rec.reason}</div>
            </div>
            <button class="btn-start-rec" dataset-id="${r_id}">Iniciar Agora</button>
        `;
        recDiv.querySelector("button").onclick = () => startLesson(r_id);
        container.appendChild(recDiv);
    }

    const grid = document.createElement("div");
    grid.className = "lesson-grid";

    // API returns { lessons: [...] } or just [...] or { error }
    let list = [];
    if (Array.isArray(data)) {
        list = data;
    } else if (data && data.lessons && Array.isArray(data.lessons)) {
        list = data.lessons;
    } else if (data && data.error) {
        container.innerHTML += `<p class="error">${data.error}</p>`;
        return;
    }

    if (list.length === 0) {
        grid.innerHTML = "<p>Nenhuma lição encontrada.</p>";
    } else {
        list.forEach(l => {
            const card = document.createElement("div");

            card.className = "lesson-card";
            const id = l.lesson_id || l.id || l.filename;

            // Highlight if recommended
            const isRec = rec && rec.recommended_lesson && rec.recommended_lesson.id === id;
            if (isRec) card.classList.add("highlight-card");

            card.innerHTML = `
                <h4>${l.title} <span class="badge">${l.level || 'A1'}</span></h4>
                <p>${l.objective}</p>
                <button class="btn-start" dataset-id="${id}">Iniciar</button>
            `;
            // Listener
            card.querySelector("button").onclick = () => startLesson(id);
            grid.appendChild(card);
        });
    }
    container.appendChild(grid);
}

// Active Lesson Methods

async function startLesson(id) {
    try {
        showToast("Iniciando lição...", "info");
        const res = await apiCall("/v1/lesson/start", "POST", { user_id: state.sessionId, lesson_id: id });

        currentLessonId = id;
        renderActiveLesson(res);
    } catch (e) {
        showToast("Erro ao iniciar: " + e.message, "err");
    }
}

function renderActiveLesson(data) {
    container.innerHTML = `
        <div class="lesson-active">
            <div class="lesson-header">
                <button id="btnLessonExit" class="secondary small">Sair</button>
                <h3>${data.lesson.title}</h3>
                <span id="stepBadge" class="badge">Passo 1</span>
            </div>
            <div class="lesson-obj">${data.lesson.objective}</div>
            <div id="lessonChat" class="chatbox" style="height:350px"></div>
            <div class="input-row">
                <input id="lessonInput" placeholder="Sua resposta..." />
                <button id="lessonSend">Enviar</button>
                <button id="lessonFinish" class="success hidden">Concluir</button>
            </div>
        </div>
    `;

    // Listeners
    document.getElementById("btnLessonExit").onclick = stopLesson;
    document.getElementById("lessonSend").onclick = sendInput;
    document.getElementById("lessonFinish").onclick = completeLesson;
    document.getElementById("lessonInput").onkeydown = (e) => { if (e.key === "Enter") sendInput(); };

    // Initial msg
    appendMsg("Tutor", data.first_step, "bot");
}

function appendMsg(role, text, cls, htmlContent = null) {
    const chat = document.getElementById("lessonChat");
    if (!chat) return;
    const div = document.createElement("div");
    div.className = `msg ${cls}`;
    if (htmlContent) div.innerHTML = htmlContent;
    else div.innerHTML = `<strong>${role}:</strong> ${text}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

async function sendInput() {
    const input = document.getElementById("lessonInput");
    const val = input.value.trim();
    if (!val) return;

    appendMsg("Você", val, "me");
    input.value = "";
    input.disabled = true;

    try {
        const res = await apiCall("/v1/lesson/next", "POST", { user_id: state.sessionId, user_input: val });

        // Feedback Card
        if (res.feedback) {
            renderFeedback(res.feedback);
        }

        if (res.status === "finished") {
            appendMsg("System", "Lição finalizada! Clique em Concluir.", "sys");
            document.getElementById("lessonFinish").classList.remove("hidden");
            document.getElementById("lessonSend").classList.add("hidden");
        } else {
            if (res.instruction) appendMsg("Tutor", res.instruction, "bot");
            document.getElementById("stepBadge").innerText = `Passo ${(res.step_index || 0) + 1}`;
            input.disabled = false;
            input.focus();
        }
    } catch (e) {
        input.disabled = false;
        showToast("Erro envio: " + e.message, "err");
    }
}

function renderFeedback(fb) {
    const html = `
        <div class="feedback-card">
            <div class="fb-scores">
                <span>G: ${fb.grammar_score}</span>
                <span>V: ${fb.vocabulary_score}</span>
                <span>F: ${fb.fluency_score}</span>
                <strong>Total: ${fb.overall_score}</strong>
            </div>
            <p>${fb.feedback_text}</p>
            ${fb.corrections && fb.corrections.length ? `<div class="fb-corr">${fb.corrections.join('<br>')}</div>` : ''}
        </div>
    `;
    appendMsg("Feedback", "", "fb", html);

    // Also log to sidebar?
    showToast(`Score parcial: ${fb.overall_score}`, "info");
}

async function completeLesson() {
    try {
        const res = await apiCall("/v1/lesson/complete", "POST", { user_id: state.sessionId, score: -1 });

        // Fetch tips
        try {
            const mem = await apiCall(`/v1/learning_memory?user_id=${state.sessionId}`);
            if (mem && mem.weak_grammar && mem.weak_grammar.length > 0) {
                showToast(`Dica: Foque em ${mem.weak_grammar[0]} na próxima!`, "warn", 6000);
            } else if (mem && mem.weak_vocab && mem.weak_vocab.length > 0) {
                showToast(`Dica: Revise a palavra '${mem.weak_vocab[0]}'.`, "warn", 6000);
            } else {
                showToast("Ótimo trabalho! Continue assim.", "success");
            }
        } catch (e) {
            showToast("Lição concluída!", "success");
        }

        // alert(`Lição concluída!`); // Removido alert intrusivo
        currentLessonId = null;
        loadCatalog();
    } catch (e) {
        showToast("Erro ao concluir: " + e.message, "err");
    }
}

async function stopLesson() {
    if (!confirm("Parar lição?")) return;
    try {
        await apiCall("/v1/lesson/stop", "POST", { user_id: state.sessionId });
    } catch (e) { console.error(e); }
    currentLessonId = null;
    loadCatalog();
}
