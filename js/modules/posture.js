export const INTERVALO_NIVEL_MS = 30000; // Intervalo de 30 segundos por nível
export const MARGEM_PROXIMIDADE = 1.15;   // Tolerância de 15% de aproximação

let distanciaPadraoPixel = null;
let inicioProximidadeExcessiva = null;
let proximoNivelAlerta = 1; // 1 = 30s (1 toque), 2 = 60s (2 toques), etc.

/**
 * Define o valor calibrado de referência em pixels
 */
export function calibrarDistancia(distanciaPixels) {
    distanciaPadraoPixel = distanciaPixels;
    inicioProximidadeExcessiva = null;
    proximoNivelAlerta = 1;
}

/**
 * Retorna o valor fixado de calibração
 */
export function getDistanciaCalibrada() {
    return distanciaPadraoPixel;
}

/**
 * Avalia a postura e calcula os disparos sonoros progressivos
 * @param {number} distanciaAtual 
 * @returns {{ alertaAtivo: boolean, segundosPerto: number, dispararAudio: boolean, repeticoesAudio: number }}
 */
export function verificarAlertaPostura(distanciaAtual) {
    if (!distanciaPadraoPixel) {
        return { alertaAtivo: false, segundosPerto: 0, dispararAudio: false, repeticoesAudio: 0 };
    }

    const limiteMuitoPerto = distanciaPadraoPixel * MARGEM_PROXIMIDADE;
    const estaPerto = distanciaAtual > limiteMuitoPerto;
    const agora = Date.now();

    if (estaPerto) {
        if (!inicioProximidadeExcessiva) {
            inicioProximidadeExcessiva = agora;
            proximoNivelAlerta = 1;
        }

        const tempoMuitoPertoMs = agora - inicioProximidadeExcessiva;
        const segundosPerto = Math.floor(tempoMuitoPertoMs / 1000);
        
        let dispararAudio = false;
        let repeticoesAudio = 0;

        // Verifica se atingiu o próximo patamar (30s = 1x, 60s = 2x, 90s = 3x...)
        const tempoNecessarioMs = proximoNivelAlerta * INTERVALO_NIVEL_MS;
        if (tempoMuitoPertoMs >= tempoNecessarioMs) {
            dispararAudio = true;
            repeticoesAudio = proximoNivelAlerta;
            proximoNivelAlerta++;
        }

        return {
            alertaAtivo: true,
            segundosPerto,
            dispararAudio,
            repeticoesAudio
        };
    } else {
        // Usuário voltou à distância correta: reseta o cronômetro e os níveis
        inicioProximidadeExcessiva = null;
        proximoNivelAlerta = 1;

        return {
            alertaAtivo: false,
            segundosPerto: 0,
            dispararAudio: false,
            repeticoesAudio: 0
        };
    }
}