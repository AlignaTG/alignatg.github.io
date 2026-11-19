/**
 * Monitoramento em segundo plano (aba oculta / janela minimizada) sem precisar do PiP.
 *
 * Problemas que este módulo resolve:
 *  1. requestAnimationFrame para quando a aba fica oculta, e setTimeout/setInterval
 *     da thread principal são limitados a ~1x/s (e ~1x/min após alguns minutos no Chrome).
 *     → Um relógio dentro de um Web Worker não sofre esse throttling; ele avisa a
 *       página por mensagem, e mensagens não são limitadas como timers.
 *  2. Com a página oculta, o <video> deixa de ser desenhado e pode "congelar" no último
 *     quadro. → ImageCapture.grabFrame() lê o quadro direto da trilha da câmera.
 */

const CODIGO_WORKER = `
let id = null;
onmessage = (e) => {
    clearInterval(id);
    id = null;
    if (e.data > 0) id = setInterval(() => postMessage(0), e.data);
};
`;

/**
 * Cria um relógio baseado em Worker que chama `aoTick` a cada `intervaloMs`.
 * Retorna null se Workers não estiverem disponíveis.
 */
export function criarRelogioSegundoPlano(intervaloMs, aoTick) {
    if (typeof Worker === 'undefined') return null;

    let worker;
    try {
        const url = URL.createObjectURL(new Blob([CODIGO_WORKER], { type: 'text/javascript' }));
        worker = new Worker(url);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.warn('Relógio em segundo plano indisponível:', err);
        return null;
    }

    worker.onmessage = aoTick;

    return {
        iniciar: () => worker.postMessage(intervaloMs),
        parar: () => worker.postMessage(0)
    };
}

/**
 * Cria um capturador de quadros direto da trilha da câmera.
 * Retorna null quando o navegador não suporta ImageCapture (ex.: Firefox/Safari),
 * caso em que o chamador deve continuar usando o <video>.
 */
export function criarCapturadorQuadros(stream) {
    const track = stream && stream.getVideoTracks ? stream.getVideoTracks()[0] : null;
    if (!track || typeof window.ImageCapture === 'undefined') return null;

    const imageCapture = new window.ImageCapture(track);

    return {
        /** @returns {Promise<ImageBitmap|null>} — quem chamar deve dar close() no bitmap */
        async capturar() {
            if (track.readyState !== 'live') return null;
            try {
                return await imageCapture.grabFrame();
            } catch {
                return null;
            }
        }
    };
}
