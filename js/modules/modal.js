import { renderizarGraficoPiscadas } from './charts.js';
import { renderizarListaAvisos, limparHistoricoAvisos } from './postureHistory.js';

export function inicializarModal() {
    const modalHistorico = document.getElementById('modal-historico');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const canvasGrafico = document.getElementById('grafico-piscadas');
    
    const tabBtnPiscadas = document.getElementById('tab-btn-piscadas');
    const tabBtnPostura = document.getElementById('tab-btn-postura');
    const tabPanePiscadas = document.getElementById('tab-conteudo-piscadas');
    const tabPanePostura = document.getElementById('tab-conteudo-postura');
    const btnLimparAvisos = document.getElementById('btn-limpar-avisos');

    function abrirModal() {
        if (!modalHistorico) return;
        modalHistorico.classList.remove('hidden');
        if (tabBtnPiscadas && tabBtnPiscadas.classList.contains('active')) {
            renderizarGraficoPiscadas(canvasGrafico);
        } else {
            renderizarListaAvisos();
        }
    }

    function fecharModal() {
        if (modalHistorico) modalHistorico.classList.add('hidden');
    }

    if (tabBtnPiscadas && tabBtnPostura) {
        tabBtnPiscadas.addEventListener('click', () => {
            tabBtnPiscadas.classList.add('active');
            tabBtnPostura.classList.remove('active');
            tabPanePiscadas.classList.add('active');
            tabPanePostura.classList.remove('active');
            renderizarGraficoPiscadas(canvasGrafico);
        });

        tabBtnPostura.addEventListener('click', () => {
            tabBtnPostura.classList.add('active');
            tabBtnPiscadas.classList.remove('active');
            tabPanePostura.classList.add('active');
            tabPanePiscadas.classList.remove('active');
            renderizarListaAvisos();
        });
    }

    if (btnLimparAvisos) {
        btnLimparAvisos.addEventListener('click', () => {
            limparHistoricoAvisos();
        });
    }

    if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModal);
    window.addEventListener('click', (e) => {
        if (e.target === modalHistorico) fecharModal();
    });

    return { abrirModal, fecharModal };
}