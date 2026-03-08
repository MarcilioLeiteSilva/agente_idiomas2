// web/js/pages/onboarding.js
import { apiCall } from "../api.js";
import { state, setUserProfile } from "../state.js";
import { showToast } from "../ui/toast.js";

let container = null;

export function mount(parent) {
    container = document.createElement("div");
    container.className = "onboarding-wrapper";
    parent.appendChild(container);

    render();
}

export function unmount() {
    if (container) container.remove();
}

function render() {
    container.innerHTML = `
        <div class="onboarding-card glass">
            <div class="onboarding-header">
                <h2>Bem-vindo, <span class="gradient-text">${state.sessionId.split('@')[0]}</span>!</h2>
                <p>Vamos configurar seu plano de estudos personalizado.</p>
            </div>

            <div class="onboarding-steps">
                <div class="step-card active" data-step="1">
                    <div class="step-icon">🌍</div>
                    <h3>Qual seu idioma alvo?</h3>
                    <div class="option-grid">
                        <div class="option-btn" data-value="en">
                            <span class="flag">🇺🇸</span>
                            <strong>Inglês</strong>
                        </div>
                        <div class="option-btn" data-value="fr">
                            <span class="flag">🇫🇷</span>
                            <strong>Francês</strong>
                        </div>
                        <div class="option-btn" data-value="es">
                            <span class="flag">🇪🇸</span>
                            <strong>Espanhol</strong>
                        </div>
                    </div>
                </div>

                <div class="step-card" data-step="2" style="display:none">
                    <div class="step-icon">📊</div>
                    <h3>Qual seu nível atual?</h3>
                    <div class="option-grid">
                        <div class="option-btn" data-value="Básico">
                            <strong>Básico</strong>
                            <span>A1 / A2</span>
                        </div>
                        <div class="option-btn" data-value="Intermediário">
                            <strong>Intermediário</strong>
                            <span>B1 / B2</span>
                        </div>
                        <div class="option-btn" data-value="Avançado">
                            <strong>Avançado</strong>
                            <span>C1 / C2</span>
                        </div>
                    </div>
                </div>

                <div class="step-card" data-step="3" style="display:none">
                    <div class="step-icon">🚀</div>
                    <h3>Tudo pronto!</h3>
                    <p>Sua trilha de aprendizado foi criada com sucesso.</p>
                    <button class="btn btn-primary" id="btnFinishOnboarding" style="width:100%; margin-top:20px">
                        Começar jornada
                    </button>
                </div>
            </div>

            <div class="onboarding-footer">
                <div class="step-dots">
                    <span class="dot active"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        </div>

        <style>
            .onboarding-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 80vh;
            }
            .onboarding-card {
                width: 100%;
                max-width: 500px;
                padding: 40px;
                text-align: center;
            }
            .onboarding-header h2 { margin-bottom: 8px; }
            .onboarding-steps { margin: 32px 0; }
            
            .option-grid {
                display: grid;
                grid-template-columns: 1fr;
                gap: 12px;
                margin-top: 20px;
            }
            .option-btn {
                background: rgba(255,255,255,0.05);
                border: 1px solid var(--border);
                padding: 16px;
                border-radius: 16px;
                cursor: pointer;
                transition: var(--trans-fast);
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 1.1rem;
            }
            .option-btn:hover {
                background: rgba(255,255,255,0.1);
                border-color: var(--primary);
            }
            .option-btn .flag { font-size: 1.5rem; }
            
            .step-dots {
                display: flex;
                justify-content: center;
                gap: 8px;
            }
            .dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--border);
            }
            .dot.active {
                background: var(--primary);
                width: 20px;
                border-radius: 4px;
            }
            .step-icon {
                font-size: 3rem;
                margin-bottom: 16px;
            }
        </style>
    `;

    let selectedTarget = 'en';
    let selectedLevel = 'Básico';
    let currentStep = 1;

    const steps = container.querySelectorAll('.step-card');
    const dots = container.querySelectorAll('.dot');

    function goToStep(step) {
        steps.forEach(s => s.style.display = 'none');
        container.querySelector(`.step-card[data-step="${step}"]`).style.display = 'block';
        dots.forEach((d, idx) => d.classList.toggle('active', idx === step - 1));
        currentStep = step;
    }

    // Step 1: Language
    container.querySelectorAll('[data-step="1"] .option-btn').forEach(btn => {
        btn.onclick = () => {
            selectedTarget = btn.dataset.value;
            goToStep(2);
        };
    });

    // Step 2: Level
    container.querySelectorAll('[data-step="2"] .option-btn').forEach(btn => {
        btn.onclick = () => {
            selectedLevel = btn.dataset.value;
            goToStep(3);
        };
    });

    // Step 3: Finish
    container.querySelector('#btnFinishOnboarding').onclick = async () => {
        try {
            await apiCall("/v1/profile", "POST", {
                user_id: state.sessionId,
                native_language: "pt",
                target_language: selectedTarget,
                level: selectedLevel,
                correction_style: "moderado"
            });
            setUserProfile({
                target_language: selectedTarget,
                level: selectedLevel
            });
            showToast("Perfil configurado!", "success");
            // Navigate to lessons
            const app = await import("../app.js");
            app.navigate("lessons");
        } catch (e) {
            showToast("Erro ao salvar: " + e.message, "error");
        }
    };
}
