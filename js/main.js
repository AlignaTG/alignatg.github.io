// Bibliotecas Externas
import 'https://esm.sh/@tensorflow/tfjs-core@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-converter@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-backend-webgl@4.20.0';
import * as faceLandmarksDetection from 'https://esm.sh/@tensorflow-models/face-landmarks-detection@1.0.5';

// Módulos Locais
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
import { processarCicloTempo, registrarPiscada, getHistoricoPiscadas, setLimiteEar, getLimiteEar } from './modules/blink.js';
import { tocarAudioRepeticoes } from './modules/audio.js';

// ============================================================================
// ELEMENTOS DO DOM
// ============================================================================
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas ? canvas.getContext('2d') : null;
const statusDiv = document.getElementById('status-container');
const earDiv = document.getElementById('ear-value');
const btnCalibrar = document.getElementById('btn-calibrar');
const distCalibradaDiv = document.getElementById('distancia-calibrada');

// Elementos do Histórico / Modal
const btnHistorico = document.getElementById('btn-historico');
const modalHistorico = document.getElementById('modal-historico');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnPip = document.getElementById('btn-pip');
const canvasGrafico = document.getElementById('grafico-piscadas');

// Container de Notificações Pop-up
let toastContainer = document.getElementById('toast-container');
if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

let detector;
let instanciaGrafico = null; // Guarda a instância do Chart.js

// ============================================================================
// GERENCIAMENTO DE POP-UPS (TOASTS)
// ============================================================================
function mostrarPopup(id, mensagem, tipo, duracaoAutoFechar = null) {
    let toast = document.getElementById(id);

    if (!toast) {
        toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${tipo}`;
        
        const texto = document.createElement('span');
        texto.className = 'toast-texto';
        texto.innerHTML = mensagem;
        
        const btnFechar = document.createElement('button');
        btnFechar.className = 'toast-fechar';
        btnFechar.innerHTML = '&times;';
        btnFechar.onclick = () => fecharPopup(id);

        toast.appendChild(texto);
        toast.appendChild(btnFechar);
        toastContainer.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
    }

    const textoSpan = toast.querySelector('.toast-texto');
    if (textoSpan && textoSpan.innerHTML !== mensagem) {
        textoSpan.innerHTML = mensagem;
    }

    if (duracaoAutoFechar) {
        if (toast.timerAutoFechar) clearTimeout(toast.timerAutoFechar);
        toast.timerAutoFechar = setTimeout(() => fecharPopup(id), duracaoAutoFechar);
    }
}

function fecharPopup(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }
}

// ============================================================================
// FUNÇÃO PARA RENDERIZAR O GRÁFICO (Chart.js)
// ============================================================================
function renderizarGraficoPiscadas() {
    const historico = getHistoricoPiscadas();

    if (!canvasGrafico) return;

    if (instanciaGrafico) {
        instanciaGrafico.destroy();
    }

    const labels = historico.map(h => h.horarioFormatado || `Min ${h.minutoIndice}`);
    const dadosPiscadas = historico.map(h => h.piscadas);
    const dadosMeta = historico.map(h => h.metaMinima || 10);

    const ctxGrafico = canvasGrafico.getContext('2d');

    // Gradiente com o verde neon do sistema (#00ff88)
    const gradient = ctxGrafico.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.35)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');

    instanciaGrafico = new Chart(ctxGrafico, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Sem dados ainda'],
            datasets: [
                {
                    label: 'PPM (Atual)',
                    data: dadosPiscadas.length > 0 ? dadosPiscadas : [0],
                    borderColor: '#00ff88',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#00ff88',
                    pointBorderColor: '#0b132b'
                },
                {
                    label: 'Meta Mínima',
                    data: dadosMeta.length > 0 ? dadosMeta : [10],
                    borderColor: '#f72585',
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#e0e6ed',
                        font: { size: 12, family: 'Segoe UI' },
                        boxWidth: 12,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#0b132b',
                    titleColor: '#00ff88',
                    bodyColor: '#e0e6ed',
                    borderColor: '#2a3a5e',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8d99ae',
                        font: { size: 11 },
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.06)'
                    },
                    ticks: {
                        color: '#8d99ae',
                        font: { size: 11 },
                        stepSize: 5
                    }
                }
            }
        }
    });
}

// ============================================================================
// LOOP DE PROCESSAMENTO DO VÍDEO
// ============================================================================
async function processarVideo() {
    if (video && video.readyState >= 2 && ctx) {
        // Sincronização contínua das dimensões internas do Canvas
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        const faces = await detector.estimateFaces(video, { flipHorizontal: false });

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const ciclo = processarCicloTempo();

        // 🔊 Dispara som e Pop-up de alerta de piscadas
        if (ciclo.novoAlertaDisparado) {
            tocarAudioRepeticoes('./assets/sounds/piscando.mp3', 3);
            mostrarPopup(
                'toast-piscada',
                `<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Alerta"> Atenção: Poucas piscadas no último minuto (${ciclo.piscadasUltimoMinuto} PPM)! Pisque mais.`,
                'toast-piscada',
                8000
            );
        }

        if (faces && faces.length > 0) {
            const pontos = faces[0].keypoints;

            // Renderiza os pontos no canvas
            if (!document.pictureInPictureElement) {
                ctx.fillStyle = '#00ff88';
                pontos.forEach(ponto => {
                    ctx.fillRect(ponto.x, ponto.y, 1.5, 1.5);
                });
            }

            // Coordenadas dos olhos e cálculo de distância
            const pE = INDICES_OLHO_ESQUERDO.map(i => pontos[i]);
            const pD = INDICES_OLHO_DIREITO.map(i => pontos[i]);
            const pEsqExterno = pontos[INDEX_OLHO_EXTERNO_ESQ];
            const pDirExterno = pontos[INDEX_OLHO_EXTERNO_DIR];

            const distanciaRostoAtual = calcularDistanciaFace(pEsqExterno, pDirExterno);

            // Validação de Postura Progressiva, Áudio e Pop-up
            const statusPostura = verificarAlertaPostura(distanciaRostoAtual);
            
            if (statusPostura.alertaAtivo) {
                // 1. Mantém o toast lateral contando os segundos em tempo real
                mostrarPopup(
                    'toast-postura',
                    `<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Aviso"> Muito perto da tela há ${statusPostura.segundosPerto}s! Afaste-se.`,
                    'toast-postura'
                );

                // 2. Quando atinge o marco, dispara áudio e o pop-up grande
                if (statusPostura.dispararAudio) {
                    tocarAudioRepeticoes('./assets/sounds/pertodatela.mp3', statusPostura.repeticoesAudio);

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

            // Cálculo do EAR e Detecção de Piscada
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

            // Status no Painel Principal (Usando innerHTML para permitir o SVG)
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
            if (earDiv) {
                earDiv.innerText = "EAR: -- | Distância: --";
            }
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
// EVENTOS E INICIALIZAÇÃO
// ============================================================================

async function alternarPiP() {
    try {
        if (!document.pictureInPictureEnabled) {
            alert("Seu navegador não suporta Picture-in-Picture.");
            return;
        }

        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else if (video) {
            await video.requestPictureInPicture();
        }
    } catch (err) {
        console.error("Erro ao alternar Picture-in-Picture:", err);
    }
}

if (btnPip) {
    btnPip.addEventListener('click', alternarPiP);
}

// Abrir Modal de Histórico e Renderizar Gráfico
if (btnHistorico && modalHistorico) {
    btnHistorico.addEventListener('click', () => {
        modalHistorico.classList.remove('hidden');
        renderizarGraficoPiscadas();
    });
}

// Fechar Modal no botão X
if (btnFecharModal && modalHistorico) {
    btnFecharModal.addEventListener('click', () => {
        modalHistorico.classList.add('hidden');
    });
}

// Fechar Modal clicando no fundo escuro
window.addEventListener('click', (e) => {
    if (e.target === modalHistorico) {
        modalHistorico.classList.add('hidden');
    }
});

// Calibração Conjunta (Distância de Referência + Limiar de EAR Dinâmico)
if (btnCalibrar) {
    btnCalibrar.addEventListener('click', async () => {
        if (!detector) return;

        const faces = await detector.estimateFaces(video, { flipHorizontal: false });
        if (faces && faces.length > 0) {
            const pontos = faces[0].keypoints;
            const pEsq = pontos[INDEX_OLHO_EXTERNO_ESQ];
            const pDir = pontos[INDEX_OLHO_EXTERNO_DIR];

            // 1. Calibra Distância
            const distancia = calcularDistanciaFace(pEsq, pDir);
            calibrarDistancia(distancia);

            // 2. Calibra EAR (Limiar definido como 68% da abertura atual dos olhos)
            const pE = INDICES_OLHO_ESQUERDO.map(i => pontos[i]);
            const pD = INDICES_OLHO_DIREITO.map(i => pontos[i]);
            const earEsq = calcularEAR(pE[0], pE[1], pE[2], pE[3], pE[4], pE[5]);
            const earDir = calcularEAR(pD[0], pD[1], pD[2], pD[3], pD[4], pD[5]);
            const earMedio = (earEsq + earDir) / 2;
            const novoLimiteEar = earMedio * 0.68;
            setLimiteEar(novoLimiteEar);

            // Atualização da UI
            if (distCalibradaDiv) {
                distCalibradaDiv.innerText = `Base: ${distancia.toFixed(0)}px | EAR: ${novoLimiteEar.toFixed(3)}`;
                distCalibradaDiv.style.backgroundColor = "#1b4d3e";
                distCalibradaDiv.style.color = "#00ff88";
            }

            btnCalibrar.innerText = "✓ Calibrado!";
            setTimeout(() => {
                btnCalibrar.innerText = "Calibrar Distância Ideal (Foto)";
            }, 1500);
        } else {
            alert("Rosto não detectado! Posicione-se bem em frente à câmera para calibrar.");
        }
    });
}

// Inicialização Principal
async function main() {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");

    // 1. Exibe a tela de carregamento com a imagem
    if (overlay) overlay.style.display = "flex";
    if (loadingText) loadingText.innerText = "Iniciando câmera...";

    try {
        // 2. Inicializa a câmera (o camera.js já dá play e ajusta o canvas)
        await iniciarCamera(video, canvas, statusDiv);

        if (loadingText) loadingText.innerText = "Carregando FaceMesh (GPU)...";
        if (statusDiv) statusDiv.innerText = "Carregando FaceMesh (GPU)...";

        // 3. Inicializa o detector MediaPipe FaceMesh
        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detector = await faceLandmarksDetection.createDetector(model, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
        });

        // 4. Oculta o overlay após carregar com sucesso
        if (overlay) overlay.style.display = "none";

        if (statusDiv) {
            statusDiv.style.color = "#00ff88";
            statusDiv.innerText = "Pronto! Clique em 'Calibrar' para registrar sua postura base.";
        }

        // 5. Inicia o loop contínuo de processamento
        processarVideo();

    } catch (err) {
        if (loadingText) loadingText.innerText = "Erro ao carregar o sistema.";
        console.error("Falha na inicialização do sistema:", err);
    }
}

// Disparo seguro após o carregamento do DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}