const CHAVE_STORAGE = 'aligna_historico_postura';

export function registrarAvisoPostura(duracaoSegundos = 30) {
    const agora = new Date();
    const horarioFormatado = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dataFormatada = agora.toLocaleDateString('pt-BR');

    const novoRegistro = {
        id: Date.now(),
        horario: horarioFormatado,
        data: dataFormatada,
        duracao: duracaoSegundos,
        mensagem: `Aviso de proximidade contínua (${duracaoSegundos}s)`
    };

    const historico = getHistoricoAvisos();
    historico.unshift(novoRegistro); // Adiciona o mais recente no topo

    // Guarda até 50 eventos para não sobrecarregar
    if (historico.length > 50) historico.pop();

    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(historico));
    return novoRegistro;
}

export function getHistoricoAvisos() {
    try {
        const dados = localStorage.getItem(CHAVE_STORAGE);
        return dados ? JSON.parse(dados) : [];
    } catch {
        return [];
    }
}

export function limparHistoricoAvisos() {
    localStorage.removeItem(CHAVE_STORAGE);
}