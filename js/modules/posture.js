// js/modules/posture.js (ou postura.js)

export const INTERVALO_NIVEL_MS = 30000;
export const MARGEM_PROXIMIDADE = 1.15;

let distanciaPadraoPixel = null;
let inicioProximidadeExcessiva = null;
let proximoNivelAlerta = 1;

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