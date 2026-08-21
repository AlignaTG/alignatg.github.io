// Limiar padrão inicial caso não seja feita calibração
export const LIMITE_EAR_PADRAO = 0.21;
export let limiteEarAtual = LIMITE_EAR_PADRAO;

export const PISCADAS_MINIMAS_POR_MINUTO = 6;
export const JANELA_TEMPO_MS = 60 * 1000;

let contadorPiscadasJanela = 0;
let olhoFechado = false;
let piscadasUltimoMinuto = 0;
let alertaPiscadaAtivo = false;
let tempoDecorridoAcumulado = 0;
let ultimoTimestampPresente = null;

const historicoPiscadas = [];

export function setLimiteEar(novoLimite) {
    if (typeof novoLimite === 'number' && !isNaN(novoLimite) && novoLimite > 0) {
        limiteEarAtual = novoLimite;
    }
}

export function getLimiteEar() {
    return limiteEarAtual;
}

/**
 * Processa a janela de tempo e reinicia do zero ao detectar retorno do usuário
 * @param {boolean} usuarioPresente 
 */
export function processarCicloTempo(usuarioPresente = false) {
    const agora = Date.now();
    let novoAlertaDisparado = false;

    if (usuarioPresente) {
        // Se a pessoa acabou de voltar (estava ausente), reseta tudo para o início
        if (ultimoTimestampPresente === null) {
            tempoDecorridoAcumulado = 0;
            contadorPiscadasJanela = 0;
            ultimoTimestampPresente = agora;
        } else {
            const delta = agora - ultimoTimestampPresente;
            tempoDecorridoAcumulado += delta;
            ultimoTimestampPresente = agora;
        }

        // Quando atinge os 60 segundos completos de presença contínua
        if (tempoDecorridoAcumulado >= JANELA_TEMPO_MS) {
            piscadasUltimoMinuto = contadorPiscadasJanela;
            alertaPiscadaAtivo = piscadasUltimoMinuto < PISCADAS_MINIMAS_POR_MINUTO;

            historicoPiscadas.push({
                timestamp: new Date().toISOString(),
                horarioFormatado: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                minutoIndice: historicoPiscadas.length + 1,
                piscadas: piscadasUltimoMinuto,
                metaMinima: PISCADAS_MINIMAS_POR_MINUTO,
                abaixoDaMeta: alertaPiscadaAtivo
            });

            if (alertaPiscadaAtivo) {
                novoAlertaDisparado = true;
            }

            contadorPiscadasJanela = 0;
            tempoDecorridoAcumulado = 0;
        }
    } else {
        // Usuário ausente: limpa o timestamp e zera o progresso acumulado
        ultimoTimestampPresente = null;
        tempoDecorridoAcumulado = 0;
        contadorPiscadasJanela = 0;
    }

    const tempoRestanteSegundos = Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorridoAcumulado) / 1000));

    return {
        tempoRestante: tempoRestanteSegundos,
        piscadasMinutoAtual: contadorPiscadasJanela,
        piscadasUltimoMinuto,
        alertaAtivo: alertaPiscadaAtivo,
        novoAlertaDisparado
    };
}

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

export function getHistoricoPiscadas() {
    return [...historicoPiscadas];
}

export function limparHistoricoPiscadas() {
    historicoPiscadas.length = 0;
}