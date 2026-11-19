// Índices dos pontos de referência da FaceMesh
export const INDEX_OLHO_EXTERNO_ESQ = 33;
export const INDEX_OLHO_EXTERNO_DIR = 263;

export const INDICES_OLHO_ESQUERDO = [33, 160, 158, 133, 153, 144];
export const INDICES_OLHO_DIREITO = [362, 385, 387, 263, 373, 380];

/**
 * EAR (Eye Aspect Ratio / Razão de Aspecto do Olho)
 * É a fórmula matemática padrão utilizada em visão computacional para medir o quão aberto ou fechado um olho está.
 */
export function calcularEAR(p1, p2, p3, p4, p5, p6) {
    const dVert1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const dVert2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const dHoriz = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    return (dVert1 + dVert2) / (2.0 * dHoriz);
}

/**
 * Calcula a distância euclidiana entre dois pontos faciais (em pixels) ( Para verificar a distancia da pessoa da tela ).
 */
export function calcularDistanciaFace(pEsq, pDir) {
    return Math.hypot(pDir.x - pEsq.x, pDir.y - pEsq.y);
}