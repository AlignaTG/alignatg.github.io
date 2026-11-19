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
    historicoAvisos.unshift({
        id: Date.now(),
        horario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

    listaElement.replaceChildren();

    if (historicoAvisos.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'aviso-vazio';
        vazio.textContent = 'Nenhum aviso de proximidade registrado nesta sessão.';
        listaElement.appendChild(vazio);
        return;
    }

    historicoAvisos.forEach(item => {
        const li = document.createElement('li');
        li.className = 'aviso-item';

        const hora = document.createElement('span');
        hora.className = 'aviso-hora';
        hora.textContent = item.horario;

        const desc = document.createElement('span');
        desc.className = 'aviso-desc';
        desc.textContent = `Muito perto por ${item.duracao}s`;

        li.append(hora, desc);
        listaElement.appendChild(li);
    });
}
