/**
 * Módulo de Controle da Sidebar / Drawer
 */
export function inicializarSidebar({ onCalibrar, onHistorico, onPip } = {}) {
    const sidebar = document.getElementById('sidebar-menu');
    const backdrop = document.getElementById('sidebar-backdrop');
    const btnAbrir = document.getElementById('btn-menu-sidebar');
    const btnFechar = document.getElementById('btn-fechar-sidebar');

    // Itens internos da Sidebar
    const itemCalibrarContainer = document.getElementById('sidebar-item-calibrar');
    const btnSidebarCalibrar = document.getElementById('btn-sidebar-calibrar');
    const btnSidebarHistorico = document.getElementById('btn-sidebar-historico');
    const btnSidebarPip = document.getElementById('btn-sidebar-pip');
    const btnCalibrarPrincipal = document.getElementById('btn-calibrar');

    function abrirSidebar() {
        if (sidebar && backdrop) {
            sidebar.classList.add('active');
            backdrop.classList.add('active');
        }
    }

    function fecharSidebar() {
        if (sidebar && backdrop) {
            sidebar.classList.remove('active');
            backdrop.classList.remove('active');
        }
    }

    // 📍 Eventos de Abertura e Fechamento
    if (btnAbrir) {
        btnAbrir.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirSidebar();
        });
    }

    if (btnFechar) {
        btnFechar.addEventListener('click', fecharSidebar);
    }

    if (backdrop) {
        backdrop.addEventListener('click', fecharSidebar);
    }

    // 📍 Ações dos Botões Internos
    if (btnSidebarCalibrar && onCalibrar) {
        btnSidebarCalibrar.addEventListener('click', () => {
            fecharSidebar();
            onCalibrar();
        });
    }

    if (btnSidebarHistorico && onHistorico) {
        btnSidebarHistorico.addEventListener('click', () => {
            fecharSidebar();
            onHistorico();
        });
    }

    if (btnSidebarPip && onPip) {
        btnSidebarPip.addEventListener('click', () => {
            fecharSidebar();
            onPip();
        });
    }

    function moverCalibracaoParaSidebar() {
        if (btnCalibrarPrincipal) {
            btnCalibrarPrincipal.classList.add('hidden');
        }
        if (itemCalibrarContainer) {
            itemCalibrarContainer.classList.remove('hidden');
        }
    }

    return {
        abrirSidebar,
        fecharSidebar,
        moverCalibracaoParaSidebar
    };
}