// js/modules/audio.js

let audioCtx = null;
const audioBuffers = new Map();

/**
 * Destrava o motor de áudio. DEVE ser chamada em um evento de toque/clique.
 */
export async function destravarAudioMobile() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

/**
 * Faz o pré-carregamento dos arquivos .mp3 na memória
 */
export async function carregarAudio(caminhoAudio) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioBuffers.has(caminhoAudio)) return;

    try {
        const resposta = await fetch(caminhoAudio);
        const arrayBuffer = await resposta.arrayBuffer();
        const bufferDecodificado = await audioCtx.decodeAudioData(arrayBuffer);
        audioBuffers.set(caminhoAudio, bufferDecodificado);
    } catch (erro) {
        console.warn(`Erro ao carregar áudio: ${caminhoAudio}`, erro);
    }
}

/**
 * Toca o áudio N vezes consecutivas
 */
export function tocarAudioRepeticoes(caminhoAudio, repeticoes = 3) {
    if (!audioCtx || !audioBuffers.has(caminhoAudio)) {
        // Fallback para HTML5 Audio caso o buffer não esteja pronto
        tocarFallbackAudio(caminhoAudio, repeticoes);
        return;
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const buffer = audioBuffers.get(caminhoAudio);
    const duracao = buffer.duration;
    const inicio = audioCtx.currentTime;

    for (let i = 0; i < repeticoes; i++) {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(inicio + (i * duracao));
    }
}

function tocarFallbackAudio(caminhoAudio, repeticoes) {
    const audio = new Audio(caminhoAudio);
    let contagem = 0;

    function proximo() {
        if (contagem < repeticoes) {
            contagem++;
            audio.currentTime = 0;
            audio.play().catch(e => console.warn("Fallback bloqueado:", e));
        }
    }

    audio.onended = proximo;
    proximo();
}