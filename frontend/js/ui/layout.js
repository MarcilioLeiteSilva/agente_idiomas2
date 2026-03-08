// web/js/ui/layout.js
import { state } from "../state.js";

export function renderLayout() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <!-- ========== HEADER ========== -->
    <header class="sticky top-0 inset-x-0 flex flex-wrap sm:justify-start sm:flex-nowrap z-[48] w-full bg-white border-b text-sm py-2.5 sm:py-4 lg:ps-64 dark:bg-slate-900 dark:border-gray-700">
      <nav class="flex basis-full items-center w-full mx-auto px-4 sm:px-6 md:px-8" aria-label="Global">
        <div class="me-5 lg:me-0 lg:hidden">
          <a class="flex-none text-xl font-semibold dark:text-white" href="#" aria-label="Brand">Agente<span class="text-blue-600">Idiomas</span></a>
        </div>

        <div class="w-full flex items-center justify-end ms-auto sm:justify-between sm:gap-x-3 sm:order-3">
          <div class="sm:hidden">
            <button type="button" class="w-[2.375rem] h-[2.375rem] inline-flex justify-center items-center gap-x-2 text-sm font-semibold rounded-full border border-transparent text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none dark:text-white dark:hover:bg-gray-700 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
              <svg class="flex-shrink-0 w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </button>
          </div>

          <div class="flex flex-row items-center justify-end gap-2">
            <!-- Navigation Toggle -->
            <button type="button" class="text-gray-500 hover:text-gray-600 lg:hidden" data-hs-overlay="#application-sidebar" aria-controls="application-sidebar" aria-label="Toggle navigation">
              <span class="sr-only">Toggle Navigation</span>
              <svg class="flex-shrink-0 w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
              </svg>
            </button>
            <!-- End Navigation Toggle -->
          </div>
        </div>
      </nav>
    </header>
    <!-- ========== END HEADER ========== -->

    <!-- Sidebar Navigation -->
    <div id="application-sidebar" class="hs-overlay hs-overlay-open:translate-x-0 -translate-x-full transition-all duration-300 transform fixed top-0 start-0 bottom-0 z-[60] w-64 bg-white border-e border-gray-200 pt-7 pb-10 overflow-y-auto lg:block lg:translate-x-0 lg:end-auto lg:bottom-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-slate-700 dark:[&::-webkit-scrollbar-thumb]:bg-slate-500 dark:bg-slate-900 dark:border-gray-700">
      <div class="px-6">
        <a class="flex-none text-xl font-semibold dark:text-white" href="#" aria-label="Brand">Agente<span class="text-blue-600">Idiomas</span></a>
      </div>

      <nav class="hs-accordion-group p-6 w-full flex flex-col flex-wrap" data-hs-accordion-always-open>
        <ul class="space-y-1.5">
          <li>
            <a data-page="text" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 bg-gray-100 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Chat de Texto
            </a>
          </li>

          <li>
            <a data-page="audio" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
              Chat de Voz
            </a>
          </li>

          <li>
            <a data-page="lessons" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              Trilhas de Estudo
            </a>
          </li>

          <li>
            <a data-page="interpreter" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
               <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
              Intérprete
            </a>
          </li>

          <li>
            <a data-page="progress" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
              Meu Progresso
            </a>
          </li>

          <li>
            <a data-page="settings" class="nav-item flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-slate-700 rounded-lg hover:bg-gray-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800 cursor-pointer" href="javascript:void(0)">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Configurações
            </a>
          </li>
        </ul>

        <div class="mt-auto pt-10 px-2">
            <button id="logoutBtn" type="button" class="w-full flex items-center gap-x-3.5 py-2 px-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10">
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Sair
            </button>
        </div>
      </nav>
    </div>
    <!-- End Sidebar -->

    <!-- Content -->
    <div class="w-full pt-4 px-4 sm:px-6 md:px-8 lg:ps-72 bg-slate-50 min-h-screen dark:bg-slate-900">
      <header class="flex items-center justify-between mb-8">
        <div>
          <h1 id="pageTitle" class="block text-2xl font-bold text-gray-800 sm:text-3xl dark:text-white">Dashboard</h1>
          <p class="mt-2 text-lg text-gray-600 dark:text-gray-400">Bem-vindo de volta, <span id="userNameDisplay" class="font-semibold text-gray-800 dark:text-gray-200">Estudante</span>.</p>
        </div>
        <div class="flex items-center gap-2">
           <span id="userLevelDisplay" class="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500">
            <span class="w-1.5 h-1.5 inline-block rounded-full bg-blue-800 dark:bg-blue-500"></span>
            Nível: ${state.userProfile?.level || 'Básico'}
          </span>
        </div>
      </header>

      <div id="mainContent" class="space-y-4 sm:space-y-6">
        <!-- Dashboard items will be here -->
      </div>
    </div>
    <!-- End Content -->
    `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function setActiveNav(pageId) {
  document.querySelectorAll(".nav-item").forEach(el => {
    const isActive = el.dataset.page === pageId;
    // Classes para Item Ativo (Light: bg-gray-100 text-slate-800 | Dark: bg-slate-800 text-white)
    el.classList.toggle("bg-gray-100", isActive);
    el.classList.toggle("text-slate-800", isActive);
    el.classList.toggle("dark:bg-slate-800", isActive);
    el.classList.toggle("dark:text-white", isActive);

    // Classes para Item Inativo (Light: text-slate-700 hover:bg-gray-50 | Dark: text-slate-400 hover:text-slate-300)
    el.classList.toggle("text-slate-700", !isActive);
    el.classList.toggle("dark:text-slate-400", !isActive);
  });
}
