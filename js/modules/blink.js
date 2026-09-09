// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================
export const LIMITE_EAR_PADRAO = 0.21;
export let limiteEarAtual = LIMITE_EAR_PADRAO;

// Parâmetros clínicos de ergonomia visual
export const PISCADAS_MINIMAS_POR_MINUTO = 6;
export const JANELA_TEMPO_MS = 60 * 1000;
export const DURACAO_DESCANSO_MS = 20 * 1000; // Regra 20-20-20 (20 segundos)

// Filtro temporal fisiológico para validação de piscada (em milissegundos)
const DURACAO_MIN_PISCADA_MS = 80;   // Descarta ruído de 1 único frame do FaceMesh
const DURACAO_MAX_PISCADA_MS = 450;  // Acima disso é considerado fechamento prolongado/cochilo

// ============================================================================
// ESTADO INTERNO DO MÓDULO
// ============================================================================
let contadorPiscadasJanela = 0;
let timestampInicioFechado = null;
let piscadasUltimoMinuto = 0;
let alertaPiscadaAtivo = false;
let tempoDecorridoAcumulado = 0;
let ultimoTimestampPresente = null;

// Controle da tela de descanso obrigatória
let ciclosConsecutivosAbaixoDaMeta = 0;
let modoDescansoAtivo = false;
let tempoInicioDescanso = 0;

// Controle de pausa manual
let sistemaPausado = false;

// Histórico volátil
const historicoPiscadas = [];

// ============================================================================
// GETTERS & SETTERS DE CONTROLE
// ============================================================================
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
    timestampInicioFechado = null;
    return sistemaPausado;
}

export function getSistemaPausado() {
    return sistemaPausado;
}

// ============================================================================
// REGISTRO TEMPORAL DE PISCADAS
// ============================================================================
export function registrarPiscada(earMedio) {
    if (sistemaPausado || modoDescansoAtivo) return;
    if (typeof earMedio !== 'number' || isNaN(earMedio)) return;

    const agora = performance.now();

    if (earMedio < limiteEarAtual) {
        // Marca o início da descida da pálpebra
        if (timestampInicioFechado === null) {
            timestampInicioFechado = agora;
        }
    } else {
        // O olho reabriu: valida a duração do fechamento
        if (timestampInicioFechado !== null) {
            const duracaoFechado = agora - timestampInicioFechado;

            if (duracaoFechado >= DURACAO_MIN_PISCADA_MS && duracaoFechado <= DURACAO_MAX_PISCADA_MS) {
                contadorPiscadasJanela++;
            }

            timestampInicioFechado = null;
        }
    }
}

// ============================================================================
// PROCESSAMENTO DO CICLO DE TEMPO (JANELA DE 60s)
// ============================================================================
export function processarCicloTempo(usuarioPresente = false) {
    const agora = Date.now();
    let novoAlertaDisparado = false;

    // 1. Pausa manual
    if (sistemaPausado) {
        ultimoTimestampPresente = null;
        timestampInicioFechado = null;
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

    // 2. Modo descanso ativo
    if (modoDescansoAtivo) {
        const tempoDecorridoDescanso = agora - tempoInicioDescanso;

        if (tempoDecorridoDescanso >= DURACAO_DESCANSO_MS) {
            modoDescansoAtivo = false;
            ciclosConsecutivosAbaixoDaMeta = 0;
            ultimoTimestampPresente = null;
            timestampInicioFechado = null;
        } else {
            ultimoTimestampPresente = null;
            timestampInicioFechado = null;
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

    // 3. Monitoramento com usuário presente
    if (usuarioPresente) {
        if (ultimoTimestampPresente !== null) {
            const delta = agora - ultimoTimestampPresente;
            tempoDecorridoAcumulado += delta;
        }
        ultimoTimestampPresente = agora;

        // Fim da janela de 60 segundos ativos
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
        // Usuário ausente: congela cronômetro e anula fechamento pendente
        ultimoTimestampPresente = null;
        timestampInicioFechado = null;
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

// ============================================================================
// HISTÓRICO E RESET
// ============================================================================
export function getHistoricoPiscadas() {
    return [...historicoPiscadas];
}

export function limparHistoricoPiscadas() {
    historicoPiscadas.length = 0;
    tempoDecorridoAcumulado = 0;
    contadorPiscadasJanela = 0;
    ultimoTimestampPresente = null;
    timestampInicioFechado = null;
    ciclosConsecutivosAbaixoDaMeta = 0;
    modoDescansoAtivo = false;
}