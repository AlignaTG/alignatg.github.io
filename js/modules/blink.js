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

// Controle de ciclos para tela de descanso
let ciclosConsecutivosAbaixoDaMeta = 0;
let modoDescansoAtivo = false;
let tempoInicioDescanso = 0;
const DURACAO_DESCANSO_MS = 20 * 1000;

// Controle de pausa geral
let sistemaPausado = false;

const historicoPiscadas = [];

export function setLimiteEar(novoLimite) {
    if (typeof novoLimite === 'number' && !isNaN(novoLimite) && novoLimite > 0) {
        limiteEarAtual = novoLimite;
    }
}

export function getLimiteEar() {
    return limiteEarAtual;
}

export function alternarPausaSistema() {
    sistemaPausado = !sistemaPausado;
    ultimoTimestampPresente = null;
    return sistemaPausado;
}

export function getSistemaPausado() {
    return sistemaPausado;
}

/**
 * Processa a janela de tempo mantendo a contagem intacta durante o descanso
 * @param {boolean} usuarioPresente 
 */
export function processarCicloTempo(usuarioPresente = false) {
    const agora = Date.now();
    let novoAlertaDisparado = false;

    // Pausa manual: congela referência sem perder dados acumulados
    if (sistemaPausado) {
        ultimoTimestampPresente = null;
        const tempoRestanteSegundos = Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorridoAcumulado) / 1000));
        return {
            tempoRestante: tempoRestanteSegundos,
            piscadasMinutoAtual: contadorPiscadasJanela,
            piscadasUltimoMinuto,
            alertaAtivo: false,
            novoAlertaDisparado: false,
            modoDescanso: false
        };
    }

    // Tela de descanso de 30s ativa
    if (modoDescansoAtivo) {
        const tempoDecorridoDescanso = agora - tempoInicioDescanso;

        if (tempoDecorridoDescanso >= DURACAO_DESCANSO_MS) {
            // Fim do descanso: desativa o modo e anula o timestamp anterior
            // Mantém tempoDecorridoAcumulado e contadorPiscadasJanela exatamente onde pararam
            modoDescansoAtivo = false;
            ciclosConsecutivosAbaixoDaMeta = 0;
            ultimoTimestampPresente = null;
        } else {
            // Durante o descanso: anula o timestamp para não contar tempo do ciclo
            ultimoTimestampPresente = null;
            return {
                tempoRestante: Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorridoAcumulado) / 1000)),
                piscadasMinutoAtual: contadorPiscadasJanela,
                piscadasUltimoMinuto,
                alertaAtivo: true,
                novoAlertaDisparado: false,
                modoDescanso: true,
                tempoDescansoRestante: Math.ceil((DURACAO_DESCANSO_MS - tempoDecorridoDescanso) / 1000)
            };
        }
    }

    if (usuarioPresente) {
        if (ultimoTimestampPresente !== null) {
            const delta = agora - ultimoTimestampPresente;
            tempoDecorridoAcumulado += delta;
        }
        ultimoTimestampPresente = agora;

        // Completa o minuto ativo
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
                ciclosConsecutivosAbaixoDaMeta++;

                if (ciclosConsecutivosAbaixoDaMeta >= 2) {
                    modoDescansoAtivo = true;
                    tempoInicioDescanso = Date.now();
                }
            } else {
                ciclosConsecutivosAbaixoDaMeta = 0;
            }

            contadorPiscadasJanela = 0;
            tempoDecorridoAcumulado = 0;
        }
    } else {
        ultimoTimestampPresente = null;
        olhoFechado = false;
    }

    const tempoRestanteSegundos = Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorridoAcumulado) / 1000));

    return {
        tempoRestante: tempoRestanteSegundos,
        piscadasMinutoAtual: contadorPiscadasJanela,
        piscadasUltimoMinuto,
        alertaAtivo: alertaPiscadaAtivo,
        novoAlertaDisparado,
        modoDescanso: false
    };
}

export function registrarPiscada(earMedio) {
    if (sistemaPausado || modoDescansoAtivo) return;
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
    tempoDecorridoAcumulado = 0;
    contadorPiscadasJanela = 0;
    ultimoTimestampPresente = null;
    ciclosConsecutivosAbaixoDaMeta = 0;
    modoDescansoAtivo = false;
}