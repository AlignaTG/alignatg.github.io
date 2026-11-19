// js/modules/audio.js

// O AudioContext real só é criado após um gesto do usuário (política de autoplay
// dos navegadores). A decodificação usa um OfflineAudioContext, que não toca som
// e por isso pode ser criado a qualquer momento — AudioBuffers servem em qualquer contexto.
let audioCtx = null;
let ctxDecodificacao = null;
const audioBuffers = new Map();

function criarContextoDecodificacao() {
    if (!ctxDecodificacao) {
        const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        ctxDecodificacao = new Offline(1, 1, 44100);
    }
    return ctxDecodificacao;
}

/**
 * Cria/destrava o motor de áudio. DEVE ser chamada em um evento de toque/clique.
 */
export async function destravarAudioMobile() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
}

// Destrava automaticamente no primeiro clique/toque/tecla.
['pointerdown', 'keydown', 'touchstart'].forEach(evento => {
    window.addEventListener(evento, () => {
        destravarAudioMobile().catch(() => {});
    }, { once: true, passive: true });
});

/**
 * Faz o pré-carregamento dos arquivos .mp3 na memória
 */
export async function carregarAudio(caminhoAudio) {
    if (audioBuffers.has(caminhoAudio)) return;

    try {
        const resposta = await fetch(caminhoAudio);
        const arrayBuffer = await resposta.arrayBuffer();
        const bufferDecodificado = await criarContextoDecodificacao().decodeAudioData(arrayBuffer);
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
        // Sem gesto ainda (ou buffer não pronto): tenta via HTML5 Audio
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
            audio.play().catch(e => console.warn("Áudio bloqueado até o primeiro clique na página:", e.name));
        }
    }

    audio.onended = proximo;
    proximo();
}
