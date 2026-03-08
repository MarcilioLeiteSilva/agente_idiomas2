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
    container.innerHTML = `
        <div class="lessons-header">
            <h2>Trilhas de Aprendizado</h2>
            <p class="text-muted">Alcance a fluência com lições personalizadas.</p>
        </div>
    `;

    // Recommendation Block
    if (rec && rec.recommended_lesson) {
        const r = rec.recommended_lesson;
        const r_id = r.lesson_id || r.id || r.filename;

        const recDiv = document.createElement("div");
        recDiv.className = "recommendation-box glass highlight-card";
        recDiv.innerHTML = `
            <div class="rec-header">⭐ Missão Recomendada</div>
            <div class="rec-body">
                <h3>${r.title}</h3>
                <p>${r.objective}</p>
                <div class="rec-reason">💡 Por que agora? ${rec.reason}</div>
            </div>
            <button class="btn btn-primary" id="btnStartRec">Começar Atividade</button>
        `;
        recDiv.querySelector("#btnStartRec").onclick = () => startLesson(r_id);
        container.appendChild(recDiv);
    }

    const grid = document.createElement("div");
    grid.className = "lesson-grid";

    let list = [];
    if (Array.isArray(data)) list = data;
    else if (data && data.lessons) list = data.lessons;

    if (list.length === 0) {
        grid.innerHTML = "<p>Nenhuma lição disponível no momento.</p>";
    } else {
        list.forEach(l => {
            const card = document.createElement("div");
            card.className = "lesson-card glass";
            const id = l.lesson_id || l.id || l.filename;

            card.innerHTML = `
                <div class="card-header">
                    <span class="badge ${l.level}">${l.level || 'A1'}</span>
                </div>
                <h4>${l.title}</h4>
                <p>${l.objective}</p>
                <div class="card-footer">
                     <button class="btn btn-outline small" id="btnStart-${id}">Praticar</button>
                </div>
            `;
            grid.appendChild(card);
            card.querySelector(`#btnStart-${id}`).onclick = () => startLesson(id);
        });
    }
    container.appendChild(grid);
}

function renderActiveLesson(data) {
    container.innerHTML = `
        <div class="lesson-active-view">
            <header class="lesson-view-header glass">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <button id="btnLessonExit" class="btn btn-icon">←</button>
                    <h3>${data.lesson.title}</h3>
                </div>
                <div class="step-tracker">
                    <span id="stepBadge" class="badge primary">Passo 1</span>
                </div>
            </header>

            <div class="lesson-content">
                <div class="objective-card glass">
                    <strong>Objetivo:</strong> ${data.lesson.objective}
                </div>
                
                <div id="lessonChat" class="chatbox lesson-chat glass"></div>
                
                <div class="lesson-input-area glass">
                    <div class="input-row">
                        <input id="lessonInput" placeholder="Sua resposta em ${state.userProfile.target_language}..." autocomplete="off"/>
                        <button id="lessonSend" class="btn btn-primary">Enviar</button>
                        <button id="lessonFinish" class="btn btn-success hidden">Finalizar lição</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById("btnLessonExit").onclick = stopLesson;
    document.getElementById("lessonSend").onclick = sendInput;
    document.getElementById("lessonFinish").onclick = completeLesson;
    document.getElementById("lessonInput").onkeydown = (e) => { if (e.key === "Enter") sendInput(); };

    appendMsg("Tutor", data.first_step, "bot");
}

function renderFeedback(fb) {
    const html = `
        <div class="feedback-card-premium glass">
            <div class="fb-header">Avaliação de Desempenho</div>
            <div class="fb-scores-grid">
                <div class="score-item"><span>Gramática</span><strong>${fb.grammar_score}/10</strong></div>
                <div class="score-item"><span>Vocabulário</span><strong>${fb.vocabulary_score}/10</strong></div>
                <div class="score-item"><span>Fluência</span><strong>${fb.fluency_score}/10</strong></div>
            </div>
            <div class="fb-text">${fb.feedback_text}</div>
            ${fb.corrections && fb.corrections.length ? `
                <div class="fb-corrections-list">
                    <strong>Correções sugeridas:</strong>
                    <ul>${fb.corrections.map(c => `<li>${c}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
    `;
    appendMsg("Feedback", "", "fb", html);
    showToast(`Score: ${fb.overall_score}`, "info");
}

// ... rest of logic remains the same (api calls) ...

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
