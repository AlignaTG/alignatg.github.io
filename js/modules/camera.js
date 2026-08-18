/**
 * Inicializa a câmera do usuário e anexa ao elemento <video>
 */
export async function iniciarCamera(videoElement, statusElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false
        });
        videoElement.srcObject = stream;
        return new Promise((resolve) => videoElement.onloadedmetadata = () => resolve(videoElement));
    } catch (err) {
        if (statusElement) {
            statusElement.style.color = "#ff4444";
            statusElement.innerText = "Erro ao acessar a webcam. Verifique as permissões.";
        }
        console.error("Erro ao iniciar a câmera:", err);
        throw err;
    }
}