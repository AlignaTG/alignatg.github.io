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
                const w = videoElement.videoWidth || 640;
                const h = videoElement.videoHeight || 480;

                videoElement.width = w;
                videoElement.height = h;

                if (canvasElement) {
                    canvasElement.width = w;
                    canvasElement.height = h;
                }

                // Ajusta proporção no container do vídeo se for celular (orientação retrato)
                const videoContainer = videoElement.closest('.video-container');
                if (videoContainer) {
                    if (w < h) {
                        videoContainer.style.aspectRatio = `${w} / ${h}`;
                    } else {
                        videoContainer.style.aspectRatio = "4 / 3";
                    }
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