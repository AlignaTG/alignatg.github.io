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
                const w = videoElement.videoWidth;
                const h = videoElement.videoHeight;

                // Define as dimensões internas exatas do buffer
                videoElement.width = w;
                videoElement.height = h;

                if (canvasElement) {
                    canvasElement.width = w;
                    canvasElement.height = h;
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