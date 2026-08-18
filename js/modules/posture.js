export const TEMPO_LIMITE_POSTURA_MS = 60000; // Tempo limite para disparar o alerta (ex: 60s)
export const MARGEM_PROXIMIDADE = 1.15;        // Tolerância de 15% de aproximação

let distanciaPadraoPixel = null;
let inicioProximidadeExcessiva = null;

/**
 * Define o valor calibrado de referência em pixels
 */
export function calibrarDistancia(distanciaPixels) {
    distanciaPadraoPixel = distanciaPixels;
    inicioProximidadeExcessiva = null;
}

/**
 * Retorna o valor fixado de calibração
 */
export function getDistanciaCalibrada() {
    return distanciaPadraoPixel;
}

/**
 * Avalia se o usuário está mais perto do que o limite calibrado pelo tempo tolerado
 */
export function verificarAlertaPostura(distanciaAtual) {
    if (!distanciaPadraoPixel) return false;

    const limiteMuitoPerto = distanciaPadraoPixel * MARGEM_PROXIMIDADE;

    if (distanciaAtual > limiteMuitoPerto) {
        if (!inicioProximidadeExcessiva) {
            inicioProximidadeExcessiva = Date.now();
        } else {
            const tempoMuitoPerto = Date.now() - inicioProximidadeExcessiva;
            if (tempoMuitoPerto >= TEMPO_LIMITE_POSTURA_MS) {
                return true;
            }
        }
    } else {
        inicioProximidadeExcessiva = null;
    }

    return false;
}