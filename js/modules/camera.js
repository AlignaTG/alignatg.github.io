/**
 * Inicializa a câmera do usuário, anexa ao <video> e sincroniza o <canvas>
 */
export async function iniciarCamera(videoElement, canvasElement, statusElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        videoElement.srcObject = stream;

        return new Promise((resolve) => {
            videoElement.onloadedmetadata = async () => {
                // Seta as propriedades nativas que o TensorFlow.js lê
                videoElement.width = videoElement.videoWidth || 640;
                videoElement.height = videoElement.videoHeight || 480;

                if (canvasElement) {
                    canvasElement.width = videoElement.width;
                    canvasElement.height = videoElement.height;
                }
                
                await videoElement.play();
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