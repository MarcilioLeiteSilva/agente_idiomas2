// web/js/ui/layout.js

export function renderLayout() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="layout-container">
        <!-- Sidebar -->
        <nav class="sidebar">
            <div class="brand">Agente Idiomas</div>
            <ul class="nav-links">
                <li data-page="text" class="nav-item">✍️ Texto</li>
                <li data-page="audio" class="nav-item">🗣️ Áudio</li>
                <li data-page="interpreter" class="nav-item">🌐 Intérprete</li>
                <li data-page="interpreter_auto" class="nav-item">🤖 Intérprete Auto</li>
                <li data-page="lessons" class="nav-item">🎓 Lições</li>
                <li data-page="progress" class="nav-item">📊 Progresso</li>
                <li data-page="settings" class="nav-item">⚙️ Config</li>
            </ul>
        </nav>

        <!-- Main Content -->
        <main id="mainContent" class="main-content">
            <!-- Page content injected here -->
        </main>

        <!-- Right Panel -->
        <aside class="right-panel">
            <h3>Assistente</h3>
            <div id="rightPanelList" class="rp-list">
                <!-- System messages -->
            </div>
        </aside>
    </div>
    `;
}

export function setActiveNav(pageId) {
    document.querySelectorAll(".nav-item").forEach(el => {
        el.classList.toggle("active", el.dataset.page === pageId);
    });
}
