// web/js/pages/progress.js
import { apiCall } from "../api.js";
import { state } from "../state.js";

let container = null;

export async function mount(parent) {
    container = document.createElement("div");
    container.innerHTML = `<h3>Carregando progresso...</h3>`;
    parent.appendChild(container);

    try {
        const [progressData, memoryData, reviewHistory, statsData] = await Promise.all([
            apiCall(`/v1/progress?user_id=${state.sessionId}`),
            apiCall(`/v1/learning_memory?user_id=${state.sessionId}`),
            apiCall(`/v1/review/history?user_id=${state.sessionId}`),
            apiCall(`/v1/stats?user_id=${state.sessionId}`)
        ]);
        render(progressData, memoryData, reviewHistory, statsData);
    } catch (e) {
        container.innerHTML = `<p style="color:red">Erro: ${e.message}</p>`;
    }
}

export function unmount() {
    if (container) container.remove();
}

function render(list, memory, reviews, stats) {
    const completed = list.filter(p => p.status === 'completed');
    const avg = completed.length ? Math.round(completed.reduce((a, b) => a + (b.score || 0), 0) / completed.length) : 0;

    let weakVocabHTML = "";
    if (memory && memory.weak_vocab && memory.weak_vocab.length > 0) {
        weakVocabHTML = `
            <div class="memory-box">
                <h4>Vocabulário para Revisar</h4>
                <div class="tags">
                    ${memory.weak_vocab.slice(0, 10).map(w => `<span class="tag tag-vocab">${w}</span>`).join('')}
                </div>
            </div>
        `;
    }

    let weakGrammarHTML = "";
    if (memory && memory.weak_grammar && memory.weak_grammar.length > 0) {
        weakGrammarHTML = `
            <div class="memory-box">
                <h4>Atenção Gramatical</h4>
                <ul class="grammar-list">
                    ${memory.weak_grammar.slice(0, 5).map(g => `<li>⚠️ ${g}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // Gamification Widget
    const dailyGoal = stats.daily_goal_xp || 50;
    const dailyXp = stats.daily_xp || 0;
    const progressPct = Math.min(100, Math.round((dailyXp / dailyGoal) * 100));

    const statsHTML = `
        <div class="stats-row gamification-row">
            <div class="stat-card xp-card">
                <div class="stat-val">⭐ ${stats.xp}</div>
                <div class="stat-lbl">XP Total</div>
            </div>
            <div class="stat-card streak-card">
                <div class="stat-val">🔥 ${stats.streak_days}</div>
                <div class="stat-lbl">Dias Seguidos</div>
            </div>
             <div class="stat-card daily-card">
                <div class="stat-lbl">Meta Diária</div>
                <div class="daily-progress">
                    <div class="daily-bar" style="width: ${progressPct}%"></div>
                </div>
                <div style="font-size: 0.8em; margin-top: 5px;">${dailyXp} / ${dailyGoal} XP</div>
            </div>
        </div>
    `;

    container.innerHTML = `
        <h2>Meu Progresso</h2>
        
        ${statsHTML}

        <div class="stats-row">
            <div class="stat-card">
                <div class="stat-val">${completed.length}</div>
                <div class="stat-lbl">Lições Concluídas</div>
            </div>
            <div class="stat-card">
                <div class="stat-val">${avg}</div>
                <div class="stat-lbl">Nota Média</div>
            </div>
             <div class="stat-card action-card" onclick="startMicroReview('${state.sessionId}')">
                <div class="stat-icon">⚡</div>
                <div class="stat-lbl">Treinar Pontos Fracos</div>
            </div>
        </div>
        
        <div id="reviewContainer" class="hidden"></div>


        <div class="learning-memory-section">
            ${weakVocabHTML}
            ${weakGrammarHTML}
        </div>
        
        <h3>Histórico de Revisão</h3>
        <ul class="progress-list">
            ${(reviews || []).slice(0, 5).map(r => `
                <li>
                    <strong>Micro Review</strong> - 
                    <span class="badge-success">Média: ${r.avg_score}</span>
                    <div style="font-size: 0.8em; color: #666;">${new Date(r.started_at).toLocaleDateString()} - ${r.items_done} itens</div>
                </li>
            `).join('')}
        </ul>

        <h3>Histórico de Lições</h3>
        <ul class="progress-list">
            ${list.slice().reverse().map(item => `
                <li>
                    <strong>${item.lesson_id}</strong> - 
                    ${item.status === 'completed' ? `<span class="badge-success">Nota: ${item.score}</span>` : '<span class="badge-warn">Em andamento</span>'}
                    <div style="font-size: 0.8em; color: #666; margin-top: 4px;">${new Date(item.started_at).toLocaleDateString()}</div>
                </li>
            `).join('')}
        </ul>
        ${list.length === 0 ? '<p>Nenhuma atividade registrada.</p>' : ''}
    `;

    // Attach global function for inline onclick (hacky but works for this architecture)
    window.startMicroReview = startMicroReview;
}

let activeReviewItems = [];
let currentReviewIndex = 0;
let reviewSessionId = null;
let reviewContainer = null;

async function startMicroReview(userId) {
    const rc = document.getElementById("reviewContainer");
    if (!rc) return;
    reviewContainer = rc;

    rc.classList.remove("hidden");
    rc.innerHTML = `<div class="review-box loading">Gerando exercícios personalizados...</div>`;

    try {
        const res = await apiCall("/v1/review/start", "POST", { user_id: userId, items: 5 });
        reviewSessionId = res.review_session_id;
        activeReviewItems = res.items;
        currentReviewIndex = 0;

        if (activeReviewItems.length === 0) {
            rc.innerHTML = `<div class="review-box">Nenhum ponto fraco identificado para revisar agora!</div>`;
            return;
        }

        renderReviewItem();
    } catch (e) {
        rc.innerHTML = `<div class="review-box error">Erro ao iniciar: ${e.message}</div>`;
    }
}

function renderReviewItem() {
    if (currentReviewIndex >= activeReviewItems.length) {
        finishReview();
        return;
    }

    const item = activeReviewItems[currentReviewIndex];
    reviewContainer.innerHTML = `
        <div class="review-box active">
            <div class="rev-header">
                <span>Exercício ${currentReviewIndex + 1}/${activeReviewItems.length}</span>
                <span class="badge">Foco: ${item.expected_focus}</span>
            </div>
            <div class="rev-prompt">${item.prompt}</div>
            <div class="rev-input-row">
                <input id="revInput" type="text" placeholder="Sua resposta..." autocomplete="off">
                <button id="revSubmit">Verificar</button>
            </div>
            <div id="revFeedback" class="rev-feedback hidden"></div>
            <div class="rev-footer">
                <button id="revNext" class="secondary hidden">Próximo</button>
            </div>
        </div>
    `;

    document.getElementById("revSubmit").onclick = () => submitReviewAnswer(item);
    document.getElementById("revInput").onkeydown = (e) => { if (e.key === "Enter") submitReviewAnswer(item); };
    document.getElementById("revNext").onclick = () => {
        currentReviewIndex++;
        renderReviewItem();
    };

    setTimeout(() => document.getElementById("revInput").focus(), 100);
}

async function submitReviewAnswer(item) {
    const input = document.getElementById("revInput");
    const val = input.value.trim();
    if (!val) return;

    input.disabled = true;
    document.getElementById("revSubmit").disabled = true;
    document.getElementById("revSubmit").innerText = "Avaliando...";

    try {
        const res = await apiCall("/v1/review/answer", "POST", {
            user_id: state.sessionId,
            review_session_id: reviewSessionId,
            exercise_id: item.id,
            type: item.type,
            user_input: val,
            expected_focus: item.expected_focus
        });

        const fb = document.getElementById("revFeedback");
        fb.classList.remove("hidden");

        const isCorrect = res.score >= 70; // Threshold arbitrário para UI
        fb.className = `rev-feedback ${isCorrect ? 'success' : 'warn'}`;
        fb.innerHTML = `
            <strong>${isCorrect ? 'Correto!' : 'Atenção'}</strong> (${res.score}%)<br>
            ${res.feedback}
            ${res.corrections && res.corrections.length ? `<div class="corr">Melhor: ${res.corrections[0]}</div>` : ''}
        `;

        document.getElementById("revSubmit").classList.add("hidden");
        const btnNext = document.getElementById("revNext");
        btnNext.classList.remove("hidden");
        btnNext.focus();

    } catch (e) {
        document.getElementById("revFeedback").innerText = "Erro: " + e.message;
        input.disabled = false;
    }
}

async function finishReview() {
    reviewContainer.innerHTML = `<div class="review-box">Finalizando sessão...</div>`;
    try {
        await apiCall("/v1/review/complete", "POST", { user_id: state.sessionId, review_session_id: reviewSessionId });
        reviewContainer.innerHTML = `
            <div class="review-box success-box">
                <h3>Sessão Concluída! 🎉</h3>
                <p>Seus pontos fracos foram reforçados.</p>
                <button onclick="mount(document.querySelector('.main-content'))">Atualizar Progresso</button>
            </div>
        `;
    } catch (e) {
        reviewContainer.innerHTML = `<div class="review-box error">Erro ao finalizar.</div>`;
    }
}
