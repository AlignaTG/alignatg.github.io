/**
 * Módulo de Gerenciamento do Histórico de Avisos de Postura
 * (Mantido apenas em memória - reseta automaticamente ao recarregar a página)
 */

// Array em memória volátil (limpo a cada reload/F5)
const historicoAvisos = [];

/**
 * Registra um novo alerta de proximidade
 * @param {number} segundosPerto
 */
export function registrarAvisoPostura(segundosPerto) {
    const agora = new Date();
    const horarioFormatado = agora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    historicoAvisos.unshift({
        id: Date.now(),
        horario: horarioFormatado,
        duracao: segundosPerto
    });

    renderizarListaAvisos();
}

/**
 * Retorna todos os avisos da sessão atual
 */
export function getHistoricoAvisos() {
    return [...historicoAvisos];
}

/**
 * Limpa o histórico manualmente
 */
export function limparHistoricoAvisos() {
    historicoAvisos.length = 0;
    renderizarListaAvisos();
}

/**
 * Atualiza a interface da lista dentro do modal
 */
export function renderizarListaAvisos() {
    const listaElement = document.getElementById('lista-avisos-postura');
    if (!listaElement) return;

    listaElement.innerHTML = '';

    if (historicoAvisos.length === 0) {
        listaElement.innerHTML = `
            <li style="text-align: center; color: var(--text-muted, #64748b); padding: 16px; font-size: 0.85rem;">
                Nenhum aviso de proximidade registrado nesta sessão.
            </li>
        `;
        return;
    }

    historicoAvisos.forEach(item => {
        const li = document.createElement('li');
        li.className = 'aviso-item';
        li.innerHTML = `
            <span class="aviso-hora">${item.horario}</span>
            <span class="aviso-desc">Muito perto por ${item.duracao}s</span>
        `;
        listaElement.appendChild(li);
    });
}

// Botão de limpar histórico do modal
const btnLimpar = document.getElementById('btn-limpar-avisos');
if (btnLimpar) {
    btnLimpar.addEventListener('click', limparHistoricoAvisos);
}