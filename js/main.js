// ============================================================================
// 1. BIBLIOTECAS EXTERNAS (TensorFlow.js & FaceMesh)
// ============================================================================
import 'https://esm.sh/@tensorflow/tfjs-core@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-converter@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-backend-webgl@4.20.0';
import * as faceLandmarksDetection from 'https://esm.sh/@tensorflow-models/face-landmarks-detection@1.0.5';

// ============================================================================
// 2. MÓDULOS INTERNOS
// ============================================================================
import { iniciarCamera } from './modules/camera.js';
import { 
    INDEX_OLHO_EXTERNO_ESQ, 
    INDEX_OLHO_EXTERNO_DIR, 
    INDICES_OLHO_ESQUERDO, 
    INDICES_OLHO_DIREITO, 
    calcularEAR, 
    calcularDistanciaFace 
} from './modules/geometry.js';
import { calibrarDistancia, getDistanciaCalibrada, verificarAlertaPostura } from './modules/posture.js';
import { processarCicloTempo, registrarPiscada, setLimiteEar, getLimiteEar } from './modules/blink.js';
import { tocarAudioRepeticoes } from './modules/audio.js';
import { registrarAvisoPostura } from './modules/postureHistory.js';
import { mostrarPopup, fecharPopup, dispararNotificacaoNativa, solicitarPermissaoNotificacao } from './modules/notifications.js';
import { inicializarSidebar } from './modules/sidebar.js';
import { inicializarModal } from './modules/modal.js';
import { alternarPiP } from './modules/pip.js';

// ============================================================================
// 3. ELEMENTOS DA INTERFACE (DOM)
// ============================================================================
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas ? canvas.getContext('2d') : null;
const statusDiv = document.getElementById('status-container');
const earDiv = document.getElementById('ear-value');
const btnCalibrar = document.getElementById('btn-calibrar');
const distCalibradaDiv = document.getElementById('distancia-calibrada');

let detector;

// ============================================================================
// 4. CONTROLES DE INTERFACE (Modal & Sidebar)
// ============================================================================
const modalController = inicializarModal();

const sidebarController = inicializarSidebar({
    onCalibrar: executarCalibracao,
    onHistorico: modalController.abrirModal,
    onPip: () => alternarPiP(video)
});

if (btnCalibrar) {
    btnCalibrar.addEventListener('click', executarCalibracao);
}

// ============================================================================
// 5. FUNÇÃO DE CALIBRAÇÃO (Distância Facial & Limiar EAR)
// ============================================================================
async function executarCalibracao() {
    if (!detector) return;

    const faces = await detector.estimateFaces(video, { flipHorizontal: false });
    if (faces && faces.length > 0) {
        const pontos = faces[0].keypoints;
        const pEsq = pontos[INDEX_OLHO_EXTERNO_ESQ];
        const pDir = pontos[INDEX_OLHO_EXTERNO_DIR];

        // 1. Calibra Distância da Face
        const distancia = calcularDistanciaFace(pEsq, pDir);
        calibrarDistancia(distancia);

        // 2. Calibra EAR Médio (68% da abertura atual como limiar de fechamento)
        const pE = INDICES_OLHO_ESQUERDO.map(i => pontos[i]);
        const pD = INDICES_OLHO_DIREITO.map(i => pontos[i]);
        const earEsq = calcularEAR(pE[0], pE[1], pE[2], pE[3], pE[4], pE[5]);
        const earDir = calcularEAR(pD[0], pD[1], pD[2], pD[3], pD[4], pD[5]);
        const earMedio = (earEsq + earDir) / 2;
        const novoLimiteEar = earMedio * 0.68;
        setLimiteEar(novoLimiteEar);

        // 3. Atualiza UI e move botão para a sidebar
        if (distCalibradaDiv) {
            distCalibradaDiv.innerText = `Base: ${distancia.toFixed(0)}px | EAR: ${novoLimiteEar.toFixed(3)}`;
            distCalibradaDiv.style.backgroundColor = "#1b4d3e";
            distCalibradaDiv.style.color = "#00ff88";
        }

        sidebarController.moverCalibracaoParaSidebar();
    } else {
        alert("Rosto não detectado! Posicione-se bem em frente à câmera para calibrar.");
    }
}

// ============================================================================
// 6. PIPELINE DE PROCESSAMENTO DE VÍDEO
// ============================================================================
async function processarVideo() {
    if (video && video.readyState >= 2 && ctx) {
        // Sincroniza a resolução interna real do sensor com o canvas
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const faces = await detector.estimateFaces(video, { flipHorizontal: false });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const ciclo = processarCicloTempo();

        // Alerta de fadiga ocular / poucas piscadas
        if (ciclo.novoAlertaDisparado) {
            tocarAudioRepeticoes('./assets/sounds/piscando.mp3', 3);
            dispararNotificacaoNativa(
                "Aligna — Poucas Piscadas!",
                `Detectadas apenas ${ciclo.piscadasUltimoMinuto} PPM. Lembre-se de piscar!`
            );
            mostrarPopup(
                'toast-piscada',
                `<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Alerta"> Atenção: Poucas piscadas no último minuto (${ciclo.piscadasUltimoMinuto} PPM)! Pisque mais.`,
                'toast-piscada',
                8000
            );
        }

        if (faces && faces.length > 0) {
            const pontos = faces[0].keypoints;

            // Renderiza os pontos da malha se não estiver no modo PiP
            if (!document.pictureInPictureElement) {
                ctx.fillStyle = '#00ff88';
                pontos.forEach(ponto => {
                    ctx.fillRect(ponto.x, ponto.y, 1.5, 1.5);
                });
            }

            // Análise de Postura / Distância
            const pEsqExterno = pontos[INDEX_OLHO_EXTERNO_ESQ];
            const pDirExterno = pontos[INDEX_OLHO_EXTERNO_DIR];
            const distanciaRostoAtual = calcularDistanciaFace(pEsqExterno, pDirExterno);
            const statusPostura = verificarAlertaPostura(distanciaRostoAtual);
            
            if (statusPostura.alertaAtivo) {
                mostrarPopup(
                    'toast-postura',
                    `<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Aviso"> Muito perto da tela há ${statusPostura.segundosPerto}s! Afaste-se.`,
                    'toast-postura'
                );

                if (statusPostura.dispararAudio) {
                    tocarAudioRepeticoes('./assets/sounds/pertodatela.mp3', statusPostura.repeticoesAudio);
                    registrarAvisoPostura(statusPostura.segundosPerto);
                    dispararNotificacaoNativa(
                        "Aligna — Postura Incorreta!",
                        `Muito perto da tela há ${statusPostura.segundosPerto}s! Afaste-se.`
                    );
                    mostrarPopup(
                        'toast-postura-grande',
                        `<img src="assets/image/attention.svg" class="toast-svg-icon-grande" alt="Perigo"> ATENÇÃO: Muito perto da tela há ${statusPostura.segundosPerto}s! Corrija sua postura.`,
                        'toast-postura-grande',
                        3000
                    );
                }
            } else {
                fecharPopup('toast-postura');
                fecharPopup('toast-postura-grande');
            }

            // Análise do EAR e Detecção de Piscadas
            const pE = INDICES_OLHO_ESQUERDO.map(i => pontos[i]);
            const pD = INDICES_OLHO_DIREITO.map(i => pontos[i]);

            if (pE[5] && pD[5]) {
                const earEsquerdo = calcularEAR(pE[0], pE[1], pE[2], pE[3], pE[4], pE[5]);
                const earDireito = calcularEAR(pD[0], pD[1], pD[2], pD[3], pD[4], pD[5]);
                const earMedio = (earEsquerdo + earDireito) / 2;

                registrarPiscada(earMedio);

                const basePixel = getDistanciaCalibrada();
                const limiteEar = getLimiteEar();
                const distTexto = basePixel 
                    ? `${distanciaRostoAtual.toFixed(0)}px (Base: ${basePixel.toFixed(0)}px)` 
                    : `${distanciaRostoAtual.toFixed(0)}px`;
                
                if (earDiv) {
                    earDiv.innerText = `EAR Médio: ${earMedio.toFixed(3)} (Limiar: ${limiteEar.toFixed(3)}) | Distância: ${distTexto} | Ciclo: ${ciclo.tempoRestante}s`;
                }
            }

            if (statusDiv) {
                if (ciclo.alertaAtivo) {
                    statusDiv.style.color = "#ff3333";
                    statusDiv.innerHTML = `<img src="assets/image/attention.svg" class="status-svg-icon" alt="Alerta"> Poucas piscadas no último min (${ciclo.piscadasUltimoMinuto} PPM)! | Atual: ${ciclo.piscadasMinutoAtual}`;
                } else {
                    statusDiv.style.color = "#00ff88";
                    statusDiv.innerText = `Piscadas no min atual: ${ciclo.piscadasMinutoAtual} | Último min: ${ciclo.piscadasUltimoMinuto} PPM`;
                }
            }
        } else {
            if (statusDiv) {
                statusDiv.style.color = "#ffffff";
                statusDiv.innerText = "Posicione seu rosto em frente à câmera";
            }
            if (earDiv) earDiv.innerText = "EAR: -- | Distância: --";
            fecharPopup('toast-postura');
        }
    }

    if (document.hidden) {
        setTimeout(processarVideo, 100);
    } else {
        requestAnimationFrame(processarVideo);
    }
}

// ============================================================================
// 7. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================
async function main() {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");

    if (overlay) overlay.style.display = "flex";
    if (loadingText) loadingText.innerText = "Iniciando câmera...";

    solicitarPermissaoNotificacao();

    try {
        await iniciarCamera(video, canvas, statusDiv);

        if (loadingText) loadingText.innerText = "Carregando FaceMesh (GPU)...";
        if (statusDiv) statusDiv.innerText = "Carregando FaceMesh (GPU)...";

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detector = await faceLandmarksDetection.createDetector(model, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
        });

        if (overlay) overlay.style.display = "none";

        if (statusDiv) {
            statusDiv.style.color = "#00ff88";
            statusDiv.innerText = "Pronto! Clique em 'Calibrar' para registrar sua postura base.";
        }

        processarVideo();

    } catch (err) {
        if (loadingText) loadingText.innerText = "Erro ao carregar o sistema.";
        console.error("Falha na inicialização do sistema:", err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}