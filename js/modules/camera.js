/**
 * Traduz erros do getUserMedia em mensagens claras para o usuário
 */
export function mensagemErroCamera(err) {
    switch (err && err.name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'Acesso à câmera negado. Libere a permissão no ícone de cadeado da barra de endereço e recarregue a página.';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return 'Nenhuma câmera encontrada. Conecte uma webcam e recarregue a página.';
        case 'NotReadableError':
        case 'AbortError':
            return 'A câmera está sendo usada por outro aplicativo. Feche-o e recarregue a página.';
        case 'NotSupportedError':
            return 'Este navegador não permite acesso à câmera. Abra a página via HTTPS em um navegador atualizado.';
        default:
            return 'Erro ao acessar a webcam. Verifique as permissões e recarregue a página.';
    }
}

/**
 * Inicializa a câmera do usuário, anexa ao <video> e sincroniza o <canvas>
 */
export async function iniciarCamera(videoElement, canvasElement) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const erro = new Error('getUserMedia indisponível');
            erro.name = 'NotSupportedError';
            throw erro;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });

        videoElement.srcObject = stream;

        return new Promise((resolve, reject) => {
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

                try {
                    await videoElement.play();
                    resolve(videoElement);
                } catch (playErr) {
                    reject(playErr);
                }
            };
        });
    } catch (err) {
        console.error("Erro ao iniciar a câmera:", err);
        throw err;
    }
}
