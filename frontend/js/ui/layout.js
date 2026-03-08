// web/js/ui/layout.js

export function renderLayout() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="layout-wrapper">
        <div class="layout-container">
            <!-- Sidebar -->
            <nav class="sidebar glass">
                <div class="brand">
                    <a href="/index.html" class="logo">Agente<span class="gradient-text">Idiomas</span></a>
                </div>
                
                <ul class="nav-links">
                    <li data-page="text" class="nav-item">✍️ Chat</li>
                    <li data-page="audio" class="nav-item">🗣️ Voz</li>
                    <li data-page="lessons" class="nav-item">🎓 Trilhas</li>
                    <li data-page="interpreter" class="nav-item">🌐 Intérprete</li>
                    <li data-page="progress" class="nav-item">📊 Evolução</li>
                    <li data-page="settings" class="nav-item">⚙️ Ajustes</li>
                    <li id="logoutBtn" class="nav-item" style="margin-top: 20px; color: var(--error);">🚪 Sair</li>
                </ul>

                <div class="user-footer glass">
                    <div class="user-avatar">👤</div>
                    <div class="user-info">
                        <span class="user-name" id="userNameDisplay">Estudante</span>
                        <span class="user-rank">Explorador</span>
                    </div>
                </div>
            </nav>

            <!-- Main Content Area -->
            <div class="main-wrapper">
                <header class="top-header glass">
                    <div class="header-left">
                        <h2 id="pageTitle">Chat</h2>
                    </div>
                    <div class="header-right">
                        <div class="stat-badge">🔥 3 Dias</div>
                        <div class="stat-badge">XP: 450</div>
                    </div>
                </header>
                
                <main id="mainContent" class="main-content">
                    <!-- Page content injected here -->
                </main>
            </div>
            
            <!-- Right Panel (Contextual) -->
            <aside class="right-panel glass">
                <div class="rp-header">
                    <h4>Assistente</h4>
                </div>
                <div id="rightPanelList" class="rp-list">
                    <!-- System messages -->
                </div>
            </aside>
        </div>
    </div>
    `;
}

export function setActiveNav(pageId) {
    document.querySelectorAll(".nav-item").forEach(el => {
        el.classList.toggle("active", el.dataset.page === pageId);
    });
}
