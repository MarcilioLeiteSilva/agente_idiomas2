// web/js/pages/settings.js
import { apiCall } from "../api.js";
import { state, setSessionId, setUserProfile } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

export async function mount(parent) {
    container = document.createElement("div");
    container.innerHTML = `<p>Carregando...</p>`;
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
        <div class="max-w-4xl mx-auto space-y-6">
            
            <div class="grid md:grid-cols-2 gap-6">
                <!-- Perfil Card -->
                <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-gray-700">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Perfil do Aluno
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-white">Nome do Aluno</label>
                            <input class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" value="${state.userProfile?.full_name || localStorage.getItem('user_name') || ''}" disabled />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-white">Endereço de E-mail</label>
                            <input class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" value="${state.userProfile?.email || localStorage.getItem('user_email') || ''}" disabled />
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-white">Idioma Nativo</label>
                            <select id="inpNative" class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
                                <option value="pt" ${state.userProfile.native_language === 'pt' ? 'selected' : ''}>Português</option>
                                <option value="en" ${state.userProfile.native_language === 'en' ? 'selected' : ''}>English</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Metas Card -->
                <div class="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-gray-700">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4-4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                        Objetivos
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-white">Idioma Alvo</label>
                            <select id="inpTarget" class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
                                <option value="en" ${state.userProfile.target_language === 'en' ? 'selected' : ''}>English (EUA/UK)</option>
                                <option value="fr" ${state.userProfile.target_language === 'fr' ? 'selected' : ''}>Français (França)</option>
                                <option value="es" ${state.userProfile.target_language === 'es' ? 'selected' : ''}>Español (Espanha)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-2 dark:text-white">Nível Atual</label>
                            <select id="inpLevel" class="py-3 px-4 block w-full border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400">
                                <option value="Básico" ${state.userProfile.level === 'Básico' ? 'selected' : ''}>Iniciante / Básico</option>
                                <option value="Intermediário" ${state.userProfile.level === 'Intermediário' ? 'selected' : ''}>Intermediário</option>
                                <option value="Avançado" ${state.userProfile.level === 'Avançado' ? 'selected' : ''}>Avançado / Fluente</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Diagnóstico Card -->
                <div class="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm dark:bg-slate-900 dark:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                             <svg class="w-5 h-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/></svg>
                             Status do Sistema
                        </h3>
                        <div class="flex items-center gap-2">
                            <span id="healthStatus" class="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-white">Aguardando...</span>
                            <button id="btnHealth" class="py-2 px-3 inline-flex items-center gap-x-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:bg-slate-900 dark:border-gray-700 dark:text-white dark:hover:bg-gray-800 transition-all">Testar</button>
                        </div>
                    </div>
                    
                    <div id="diagnosticsArea" class="hidden mt-4 p-4 bg-gray-50 rounded-xl font-mono text-xs text-blue-600 dark:bg-black/20 dark:text-blue-400 overflow-x-auto"></div>

                    <div class="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                         <button id="btnSaveSettings" class="py-3 px-8 inline-flex items-center gap-x-2 text-sm font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-lg">
                            Salvar Alterações
                        </button>
                    </div>
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
    const newSession = state.sessionId;
    const nat = document.getElementById("inpNative").value;
    const tgt = document.getElementById("inpTarget").value;
    const lvl = document.getElementById("inpLevel").value;

    if (!newSession) {
        showToast("Erro: ID de sessão não encontrado.", "error");
        return;
    }

    setSessionId(newSession);
    setUserProfile({ native_language: nat, target_language: tgt, level: lvl });

    let hasError = false;

    // 1. Salvar perfil de aprendizado no backend (idioma, nível)
    try {
        await apiCall("/v1/profile", "POST", {
            user_id: newSession,
            native_language: nat,
            target_language: tgt,
            level: lvl,
            correction_style: "moderado"
        });
    } catch (e) {
        hasError = true;
        showToast("Erro ao salvar perfil: " + e.message, "error");
    }

    // 2. Salvar configurações de sessão (output_mode, language)
    try {
        await apiCall("/v1/settings", "POST", {
            session_id: newSession,
            output_mode: "text",
            language: tgt
        });
    } catch (e) {
        hasError = true;
        showToast("Erro ao persistir configurações: " + e.message, "error");
    }

    if (!hasError) {
        // Atualizar badge de nível no header
        const levelDisplay = document.getElementById("userLevelDisplay");
        if (levelDisplay) {
            levelDisplay.innerHTML = `<span class="w-1.5 h-1.5 inline-block rounded-full bg-blue-800 dark:bg-blue-500"></span> Nível: ${lvl}`;
        }
        showToast("Perfil atualizado com sucesso!", "success");
    }
}
