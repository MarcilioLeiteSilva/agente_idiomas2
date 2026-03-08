// web/js/ui/layout.js

export function renderLayout() {
    const app = document.getElementById("app");
    app.innerHTML = `
    <div class="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <!-- Sidebar -->
        <nav class="w-64 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl shrink-0">
            <div class="p-6">
                <a href="/dashboard.html" class="text-2xl font-bold tracking-tight">
                    Agente<span class="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">Idiomas</span>
                </a>
            </div>
            
            <ul class="flex-1 px-4 space-y-1 overflow-y-auto py-4">
                <li data-page="text" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="message-square" class="w-5 h-5 text-slate-400 group-hover:text-violet-400"></i>
                    <span class="font-medium">Chat Interativo</span>
                </li>
                <li data-page="audio" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="mic" class="w-5 h-5 text-slate-400 group-hover:text-blue-400"></i>
                    <span class="font-medium">Voz Acadêmica</span>
                </li>
                <li data-page="lessons" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="graduation-cap" class="w-5 h-5 text-slate-400 group-hover:text-emerald-400"></i>
                    <span class="font-medium">Trilhas de Estudo</span>
                </li>
                <li data-page="interpreter" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="languages" class="w-5 h-5 text-slate-400 group-hover:text-amber-400"></i>
                    <span class="font-medium">Intérprete Global</span>
                </li>
                <li data-page="progress" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-slate-400 group-hover:text-rose-400"></i>
                    <span class="font-medium">Minha Evolução</span>
                </li>
                <li data-page="settings" class="nav-item group flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]">
                    <i data-lucide="settings" class="w-5 h-5 text-slate-400 group-hover:text-slate-200"></i>
                    <span class="font-medium">Configurações</span>
                </li>
            </ul>

            <div class="mt-auto p-4 border-t border-slate-800 space-y-4">
                <button id="logoutBtn" class="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-all active:scale-[0.98]">
                    <i data-lucide="log-out" class="w-5 h-5"></i>
                    <span class="font-medium">Sair da Sessão</span>
                </button>

                <div class="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-white shadow-lg">
                        <i data-lucide="user" class="w-5 h-5"></i>
                    </div>
                    <div class="flex flex-col min-w-0">
                        <span class="text-sm font-semibold truncate text-white" id="userNameDisplay">Estudante</span>
                        <span class="text-xs text-slate-400">Nível: Explorador</span>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Main Content Area -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <header class="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-950/50 backdrop-blur-md z-10">
                <div class="flex items-center gap-4">
                    <h2 id="pageTitle" class="text-lg font-semibold text-white">Chat</h2>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium">
                        <i data-lucide="flame" class="w-4 h-4"></i>
                        <span>3 Dias</span>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium">
                        <i data-lucide="zap" class="w-4 h-4"></i>
                        <span>XP: 450</span>
                    </div>
                </div>
            </header>
            
            <main id="mainContent" class="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.05),transparent)]">
                <!-- Page content injected here -->
            </main>
        </div>
        
        <!-- Right Panel (Contextual) -->
        <aside class="w-80 hidden xl:flex flex-col border-l border-slate-800 bg-slate-950/30 overflow-hidden">
            <div class="p-6 border-b border-slate-800">
                <h4 class="font-semibold flex items-center gap-2 text-white">
                    <i data-lucide="sparkles" class="w-5 h-5 text-violet-400"></i>
                    Assistente AI
                </h4>
            </div>
            <div id="rightPanelList" class="flex-1 overflow-y-auto p-6 space-y-4">
                <!-- System messages -->
                <div class="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 text-sm text-slate-400 italic">
                    Nenhuma sugestão no momento. Comece a praticar!
                </div>
            </div>
        </aside>
    </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export function setActiveNav(pageId) {
    document.querySelectorAll(".nav-item").forEach(el => {
        const isActive = el.dataset.page === pageId;
        el.classList.toggle("bg-white/10", isActive);
        el.classList.toggle("text-white", isActive);
        el.classList.toggle("text-slate-400", !isActive);
    });
}
