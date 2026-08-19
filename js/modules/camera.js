/**
 * Inicializa a câmera do usuário, anexa ao <video> e sincroniza o <canvas>
 */
export async function iniciarCamera(videoElement, canvasElement, statusElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                // 'ideal' permite ao celular fornecer o aspect ratio nativo (ex: 480x640 em retrato)
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        videoElement.srcObject = stream;

        return new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                // Sincroniza a resolução interna do canvas com a resolução real da câmera
                if (canvasElement) {
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                }
                
                videoElement.play();
                resolve(videoElement);
            };
        });
    } catch (err) {
        if (statusElement) {
            statusElement.style.color = "#ff4444";
            statusElement.innerText = "Erro ao acessar a webcam. Verifique as permissões.";
        }
        console.error("Erro ao iniciar a câmera:", err);
        throw err;
    }
}