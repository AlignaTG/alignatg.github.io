import { renderizarGraficoPiscadas } from './charts.js';
import { getHistoricoAvisos, limparHistoricoAvisos } from './postureHistory.js';

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

    function renderizarListaAvisos() {
        const listaUl = document.getElementById('lista-avisos-postura');
        if (!listaUl) return;

        const avisos = getHistoricoAvisos();
        listaUl.innerHTML = '';

        if (avisos.length === 0) {
            listaUl.innerHTML = '<li class="aviso-item" style="justify-content: center; color: #8b949e;">Nenhum aviso registrado até o momento.</li>';
            return;
        }

        avisos.forEach(item => {
            const li = document.createElement('li');
            li.className = 'aviso-item';
            li.innerHTML = `
                <div>
                    <span class="aviso-hora">${item.horario}</span>
                    <span class="aviso-desc">(${item.data})</span>
                </div>
                <span class="aviso-desc">${item.mensagem}</span>
            `;
            listaUl.appendChild(li);
        });
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
            renderizarListaAvisos();
        });
    }

    if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModal);
    window.addEventListener('click', (e) => {
        if (e.target === modalHistorico) fecharModal();
    });

    return { abrirModal, fecharModal };
}