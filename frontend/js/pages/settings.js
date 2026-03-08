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
        <div class="settings-grid">
            <div class="card glass">
                <h3>Perfil do Aluno</h3>
                <div class="form-group">
                    <label>Seu Nome / ID:</label>
                    <input id="inpSession" class="styled-input" value="${state.sessionId}" />
                </div>
                <div class="form-group">
                    <label>Idioma Nativo:</label>
                    <select id="inpNative" class="styled-input">
                        <option value="pt" ${state.userProfile.native_language === 'pt' ? 'selected' : ''}>Português</option>
                        <option value="en" ${state.userProfile.native_language === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>
            </div>

            <div class="card glass">
                <h3>Metas de Aprendizado</h3>
                <div class="form-group">
                    <label>Idioma Alvo:</label>
                    <select id="inpTarget" class="styled-input">
                        <option value="en" ${state.userProfile.target_language === 'en' ? 'selected' : ''}>English (EUA/UK)</option>
                        <option value="fr" ${state.userProfile.target_language === 'fr' ? 'selected' : ''}>Français (França)</option>
                        <option value="es" ${state.userProfile.target_language === 'es' ? 'selected' : ''}>Español (Espanha)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nível de Proficiência:</label>
                    <select id="inpLevel" class="styled-input">
                        <option value="Básico" ${state.userProfile.level === 'Básico' ? 'selected' : ''}>Iniciante / Básico</option>
                        <option value="Intermediário" ${state.userProfile.level === 'Intermediário' ? 'selected' : ''}>Intermediário (B1/B2)</option>
                        <option value="Avançado" ${state.userProfile.level === 'Avançado' ? 'selected' : ''}>Avançado / Fluente</option>
                    </select>
                </div>
            </div>

            <div class="card glass full-width">
                <h3>Conectividade & Diagnóstico</h3>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button id="btnHealth" class="btn btn-outline">Testar Conexão</button>
                    <span id="healthStatus" class="badge">Aguardando...</span>
                </div>
                <div id="diagnosticsArea" class="diag-output" style="display: none;"></div>
                
                <div style="margin-top: 24px; display: flex; justify-content: flex-end;">
                    <button id="btnSaveSettings" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("btnSaveSettings").onclick = save;
    document.getElementById("btnHealth").onclick = checkHealth;
}

// Styles added via JS for specific layout or could be in design-system.css
const extraStyles = `
    .settings-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }
    .full-width { grid-column: span 2; }
    .card { padding: 24px; border-radius: 20px; }
    .diag-output { 
        margin-top: 16px; 
        padding: 16px; 
        background: rgba(0,0,0,0.2); 
        border-radius: 12px; 
        font-family: monospace; 
        font-size: 0.85rem; 
        color: var(--primary-light);
    }
    .styled-input {
        width: 100%;
        padding: 12px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border);
        border-radius: 10px;
        color: white;
        margin-top: 8px;
    }
`;

async function checkHealth() {
    const statusSpan = document.getElementById("healthStatus");
    const diagArea = document.getElementById("diagnosticsArea");

    statusSpan.textContent = "Verificando...";
    statusSpan.style.background = "rgba(255,255,255,0.1)";
    diagArea.style.display = "none";

    try {
        await apiCall("/v1/health");
        statusSpan.textContent = "CONECTADO";
        statusSpan.style.background = "rgba(16, 185, 129, 0.2)";
        statusSpan.style.color = "#10b981";

        try {
            const diag = await apiCall("/v1/diagnostics");
            diagArea.style.display = "block";
            diagArea.innerHTML = `<pre>${JSON.stringify(diag, null, 2)}</pre>`;
        } catch (e) {
            diagArea.style.display = "block";
            diagArea.innerHTML = "<em>Diagnostics restritos ao admin.</em>";
        }
    } catch (e) {
        statusSpan.textContent = "OFFLINE";
        statusSpan.style.background = "rgba(239, 68, 68, 0.2)";
        statusSpan.style.color = "#ef4444";
    }
}

async function save() {
    const newSession = document.getElementById("inpSession").value.trim();
    const nat = document.getElementById("inpNative").value;
    const tgt = document.getElementById("inpTarget").value;
    const lvl = document.getElementById("inpLevel").value;

    if (!newSession) {
        showToast("Escolha um nome ou ID de usuário", "error");
        return;
    }

    setSessionId(newSession);
    setUserProfile({ native_language: nat, target_language: tgt, level: lvl });

    try {
        await apiCall("/v1/settings", "POST", {
            session_id: newSession,
            output_mode: "text",
            language: tgt
        });
        showToast("Perfil atualizado com sucesso!", "success");
    } catch (e) {
        showToast("Erro ao persistir configurações: " + e.message, "error");
    }
}
