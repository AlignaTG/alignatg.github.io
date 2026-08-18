/**
 * Toca um arquivo de áudio N vezes consecutivas
 * @param {string} caminhoAudio - Caminho para o arquivo .mp3
 * @param {number} repeticoes - Quantidade de vezes para tocar
 */
export function tocarAudioRepeticoes(caminhoAudio, repeticoes = 3) {
    let contagem = 0;
    const audio = new Audio(caminhoAudio);

    function tocarProximo() {
        if (contagem < repeticoes) {
            contagem++;
            audio.currentTime = 0;
            audio.play().catch(err => {
                console.warn("Reprodução de áudio bloqueada ou com erro:", err);
            });
        }
    }

    // Quando terminar a reprodução atual, chama a próxima
    audio.addEventListener('ended', tocarProximo);

    // Inicia a primeira reprodução
    tocarProximo();
}