/**
 * Gerenciamento da Sidebar Lateral (Gaveta) e visibilidade de botões
 */
export function inicializarSidebar({ onCalibrar, onHistorico, onPip }) {
    const btnAbrirSidebar = document.getElementById('btn-abrir-sidebar');
    const btnFecharSidebar = document.getElementById('btn-fechar-sidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    
    const btnSidebarCalibrar = document.getElementById('btn-sidebar-calibrar');
    const sidebarCalibrarContainer = document.getElementById('sidebar-calibrar-container');
    const btnCalibrarPrincipal = document.getElementById('btn-calibrar');
    
    const btnHistorico = document.getElementById('btn-historico');
    const btnPip = document.getElementById('btn-pip');

    function abrirSidebar() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.add('active');
            sidebarBackdrop.classList.add('active');
        }
    }

    function fecharSidebar() {
        if (sidebar && sidebarBackdrop) {
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        }
    }

    // Eventos de Abertura / Fechamento
    if (btnAbrirSidebar) btnAbrirSidebar.addEventListener('click', abrirSidebar);
    if (btnFecharSidebar) btnFecharSidebar.addEventListener('click', fecharSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', fecharSidebar);

    // Evento de Calibração na Sidebar
    if (btnSidebarCalibrar && onCalibrar) {
        btnSidebarCalibrar.addEventListener('click', () => {
            onCalibrar();
            fecharSidebar();
        });
    }

    // Evento de Histórico
    if (btnHistorico && onHistorico) {
        btnHistorico.addEventListener('click', () => {
            fecharSidebar();
            onHistorico();
        });
    }

    // Evento de Picture-in-Picture
    if (btnPip && onPip) {
        btnPip.addEventListener('click', () => {
            fecharSidebar();
            onPip();
        });
    }

    // Função exposta para transferir o botão da tela para a sidebar
    function moverCalibracaoParaSidebar() {
        if (btnCalibrarPrincipal) btnCalibrarPrincipal.classList.add('hidden');
        if (sidebarCalibrarContainer) sidebarCalibrarContainer.classList.remove('hidden');
    }

    return {
        abrirSidebar,
        fecharSidebar,
        moverCalibracaoParaSidebar
    };
}