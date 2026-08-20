// Limiar padrão inicial caso não seja feita calibração
export const LIMITE_EAR_PADRAO = 0.21;
export let limiteEarAtual = LIMITE_EAR_PADRAO;

export const PISCADAS_MINIMAS_POR_MINUTO = 6;
export const JANELA_TEMPO_MS = 60 * 1000; //

let contadorPiscadasJanela = 0;
let olhoFechado = false;
let tempoInicioJanela = Date.now();
let piscadasUltimoMinuto = 0;
let alertaPiscadaAtivo = false;

// Array para armazenar o histórico de cada ciclo de 1 minuto
const historicoPiscadas = [];

/**
 * Atualiza o limite de EAR dinamicamente (chamado na calibração)
 * @param {number} novoLimite 
 */
export function setLimiteEar(novoLimite) {
    if (typeof novoLimite === 'number' && !isNaN(novoLimite) && novoLimite > 0) {
        limiteEarAtual = novoLimite;
    }
}

/**
 * Retorna o limite de EAR em vigor
 * @returns {number}
 */
export function getLimiteEar() {
    return limiteEarAtual;
}

/**
 * Processa a janela de tempo e salva o histórico a cada minuto finalizado
 */
export function processarCicloTempo() {
    const agora = Date.now();
    const tempoDecorrido = agora - tempoInicioJanela;
    const tempoRestanteSegundos = Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorrido) / 1000));
    
    let novoAlertaDisparado = false;

    // Quando fecha o ciclo de 1 minuto
    if (tempoDecorrido >= JANELA_TEMPO_MS) {
        piscadasUltimoMinuto = contadorPiscadasJanela;
        alertaPiscadaAtivo = piscadasUltimoMinuto < PISCADAS_MINIMAS_POR_MINUTO;
        
        // 📊 Registra o minuto encerrado no histórico
        historicoPiscadas.push({
            timestamp: new Date().toISOString(),
            horarioFormatado: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            minutoIndice: historicoPiscadas.length + 1,
            piscadas: piscadasUltimoMinuto,
            metaMinima: PISCADAS_MINIMAS_POR_MINUTO,
            abaixoDaMeta: alertaPiscadaAtivo
        });

        // Se ativou o alerta neste ciclo, sinaliza para tocar o som
        if (alertaPiscadaAtivo) {
            novoAlertaDisparado = true;
        }

        contadorPiscadasJanela = 0;
        tempoInicioJanela = Date.now();
    }

    return {
        tempoRestante: tempoRestanteSegundos,
        piscadasMinutoAtual: contadorPiscadasJanela,
        piscadasUltimoMinuto,
        alertaAtivo: alertaPiscadaAtivo,
        novoAlertaDisparado
    };
}

/**
 * Registra a transição de olho aberto/fechado com base no limite calibrado
 */
export function registrarPiscada(earMedio) {
    if (typeof earMedio !== 'number' || isNaN(earMedio)) return;

    if (earMedio < limiteEarAtual) {
        olhoFechado = true;
    } else {
        if (olhoFechado) {
            contadorPiscadasJanela++;
            olhoFechado = false;
        }
    }
}

/**
 * Retorna uma cópia de todos os registros históricos acumulados
 */
export function getHistoricoPiscadas() {
    return [...historicoPiscadas];
}

/**
 * Limpa o histórico de registros
 */
export function limparHistoricoPiscadas() {
    historicoPiscadas.length = 0;
}