// web/js/pages/settings.js
import { apiCall } from "../api.js";
import { state, setSessionId, setUserProfile } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

export async function mount(parent) {
    container = document.createElement("div");
    container.innerHTML = `<h2>Configurações</h2><p>Carregando...</p>`;
    parent.appendChild(container);

    // Fetch current profile
    try {
        // We assume session_id is valid for now, usually we'd have a login page
        // But here we just show what's in state
        render();
    } catch (e) {
        container.innerHTML = `<p>Erro: ${e.message}</p>`;
    }
}

export function unmount() {
    if (container) container.remove();
}

function render() {
    container.innerHTML = `
        <h2>Configurações</h2>
        <div class="form-group">
            <label>Session ID (User):</label>
            <input id="inpSession" value="${state.sessionId}" />
        </div>
        <div class="form-group">
            <label>Idioma Nativo:</label>
            <select id="inpNative">
                <option value="pt" ${state.userProfile.native_language === 'pt' ? 'selected' : ''}>Português</option>
                <option value="en" ${state.userProfile.native_language === 'en' ? 'selected' : ''}>English</option>
            </select>
        </div>
        <div class="form-group">
            <label>Idioma Alvo:</label>
            <select id="inpTarget">
                <option value="en" ${state.userProfile.target_language === 'en' ? 'selected' : ''}>English</option>
                <option value="fr" ${state.userProfile.target_language === 'fr' ? 'selected' : ''}>Français</option>
                <option value="pt" ${state.userProfile.target_language === 'pt' ? 'selected' : ''}>Português</option>
            </select>
        </div>
        <div class="form-group">
            <label>Nível:</label>
            <select id="inpLevel">
                <option value="A1" ${state.userProfile.level === 'A1' ? 'selected' : ''}>A1 (Iniciante)</option>
                <option value="A2" ${state.userProfile.level === 'A2' ? 'selected' : ''}>A2 (Básico)</option>
                <option value="B1" ${state.userProfile.level === 'B1' ? 'selected' : ''}>B1 (Intermediário)</option>
                <option value="B2" ${state.userProfile.level === 'B2' ? 'selected' : ''}>B2 (Avançado)</option>
            </select>
        </div>
        <hr/>
        <h3>Diagnóstico</h3>
        <div class="form-group">
            <button id="btnHealth" class="secondary-btn">Testar Conexão (Health)</button>
            <span id="healthStatus" style="margin-left: 10px; font-weight: bold;"></span>
        </div>
        <div id="diagnosticsArea" style="margin-top: 10px; font-family: monospace; font-size: 0.9em; background: #eee; padding: 10px; display: none;">
            <!-- Metrics will appear here -->
        </div>

        <button id="btnSaveSettings" class="primary-btn" style="margin-top: 20px;">Salvar</button>
    `;

    document.getElementById("btnSaveSettings").onclick = save;
    document.getElementById("btnHealth").onclick = checkHealth;
}

async function checkHealth() {
    const statusSpan = document.getElementById("healthStatus");
    const diagArea = document.getElementById("diagnosticsArea");

    statusSpan.textContent = "Verificando...";
    statusSpan.style.color = "#666";
    diagArea.style.display = "none";
    diagArea.innerHTML = "";

    try {
        await apiCall("/v1/health");
        statusSpan.textContent = "OK (Online)";
        statusSpan.style.color = "green";

        // Try diagnostics
        try {
            const diag = await apiCall("/v1/diagnostics");
            diagArea.style.display = "block";
            diagArea.innerHTML = `<strong>Métricas:</strong><br/><pre>${JSON.stringify(diag, null, 2)}</pre>`;
        } catch (e) {
            diagArea.style.display = "block";
            diagArea.innerHTML = "<em>Diagnostics desabilitado ou restrito.</em>";
        }

    } catch (e) {
        statusSpan.textContent = "Erro (Offline)";
        statusSpan.style.color = "red";
    }
}

async function save() {
    const newSession = document.getElementById("inpSession").value.trim();
    const nat = document.getElementById("inpNative").value;
    const tgt = document.getElementById("inpTarget").value;
    const lvl = document.getElementById("inpLevel").value;

    if (!newSession) return alert("Session ID obrigatório");

    setSessionId(newSession);
    setUserProfile({ native_language: nat, target_language: tgt, level: lvl });

    // Persist to backend
    try {
        await apiCall("/v1/settings", "POST", {
            session_id: newSession,
            output_mode: "text", // default
            language: tgt // update agent lang
        });
        showToast("Configurações salvas!", "success");
    } catch (e) {
        showToast("Erro ao salvar: " + e.message, "err");
    }
}
