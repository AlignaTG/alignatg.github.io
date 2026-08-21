/**
 * Gerenciador do Modo Flutuante (Picture-in-Picture)
 */
export async function alternarPiP(videoElement) {
    try {
        if (!document.pictureInPictureEnabled) {
            alert("Seu navegador não suporta o modo flutuante (Picture-in-Picture).");
            return;
        }

        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (videoElement) {
            await videoElement.requestPictureInPicture();
        }
    } catch (err) {
        console.error("Erro ao alternar Picture-in-Picture:", err);
    }
}