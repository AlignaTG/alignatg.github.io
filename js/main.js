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
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status-container');
const earDiv = document.getElementById('ear-value');
const btnCalibrar = document.getElementById('btn-calibrar');
const distCalibradaDiv = document.getElementById('distancia-calibrada');

// Elementos do Histórico / Modal
const btnHistorico = document.getElementById('btn-historico');
const modalHistorico = document.getElementById('modal-historico');
const btnFecharModal = document.getElementById('btn-fechar-modal');
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
    if (textoSpan && textoSpan.innerText !== mensagem) {
        textoSpan.innerText = mensagem;
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

    const gradient = ctxGrafico.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(76, 201, 240, 0.35)');
    gradient.addColorStop(1, 'rgba(76, 201, 240, 0.0)');

    instanciaGrafico = new Chart(ctxGrafico, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Sem dados ainda'],
            datasets: [
                {
                    label: 'PPM (Atual)',
                    data: dadosPiscadas.length > 0 ? dadosPiscadas : [0],
                    borderColor: '#4cc9f0',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#4cc9f0',
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
                    titleColor: '#4cc9f0',
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
    if (video.readyState >= 2) {
        // Sincronização contínua das dimensões internas do Canvas com a resolução real da câmera
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
                `⚠️ Atenção: Poucas piscadas no último minuto (${ciclo.piscadasUltimoMinuto} PPM)! Pisque mais.`,
                'toast-piscada',
                8000
            );
        }

        if (faces && faces.length > 0) {
            const pontos = faces[0].keypoints;

            // Renderiza os pontos no canvas
            pontos.forEach(ponto => {
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(ponto.x, ponto.y, 1.5, 1.5);
            });

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
                    `Muito perto da tela há ${statusPostura.segundosPerto}s! Afaste-se.`,
                    'toast-postura'
                );

                // 2. Quando atinge o marco (30s, 60s, 90s...), dispara o áudio e o pop-up grande central por 3 segundos
                if (statusPostura.dispararAudio) {
                    tocarAudioRepeticoes('./assets/sounds/pertodatela.mp3', statusPostura.repeticoesAudio);

                    mostrarPopup(
                        'toast-postura-grande',
                        `ATENÇÃO: Muito perto da tela há ${statusPostura.segundosPerto}s! Corrija sua postura.`,
                        'toast-postura-grande',
                        3000 // Desaparece automaticamente após 3 segundos
                    );
                }
            } else {
                // Usuário corrigiu a postura: fecha ambos os pop-ups
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
                
                earDiv.innerText = `EAR Médio: ${earMedio.toFixed(3)} (Limiar: ${limiteEar.toFixed(3)}) | Distância: ${distTexto} | Ciclo: ${ciclo.tempoRestante}s`;
            }

            // Status no Painel Principal
            if (ciclo.alertaAtivo) {
                statusDiv.style.color = "#ff3333";
                statusDiv.innerText = `⚠️ Poucas piscadas no último min (${ciclo.piscadasUltimoMinuto} PPM)! | Atual: ${ciclo.piscadasMinutoAtual}`;
            } else {
                statusDiv.style.color = "#00ff88";
                statusDiv.innerText = `Piscadas no min atual: ${ciclo.piscadasMinutoAtual} | Último min: ${ciclo.piscadasUltimoMinuto} PPM`;
            }
        } else {
            statusDiv.style.color = "#ffffff";
            statusDiv.innerText = "Posicione seu rosto em frente à câmera";
            earDiv.innerText = "EAR: -- | Distância: --";
            fecharPopup('toast-postura');
        }
    }

    requestAnimationFrame(processarVideo);
}

// ============================================================================
// EVENTOS E INICIALIZAÇÃO
// ============================================================================

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
        distCalibradaDiv.innerText = `Base: ${distancia.toFixed(0)}px | EAR: ${novoLimiteEar.toFixed(3)}`;
        distCalibradaDiv.style.backgroundColor = "#1b4d3e";
        distCalibradaDiv.style.color = "#00ff88";

        btnCalibrar.innerText = "✓ Calibrado!";
        setTimeout(() => {
            btnCalibrar.innerText = "Calibrar Distância Ideal (Foto)";
        }, 1500);
    } else {
        alert("Rosto não detectado! Posicione-se bem em frente à câmera para calibrar.");
    }
});

// Inicialização Principal
async function main() {
    await iniciarCamera(video, canvas, statusDiv);
    video.play();

    statusDiv.innerText = "Carregando FaceMesh (Aguarde)...";

    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    detector = await faceLandmarksDetection.createDetector(model, {
        runtime: 'tfjs',
        refineLandmarks: true,
        maxFaces: 1
    });

    statusDiv.innerText = "Pronto! Clique em 'Calibrar' para registrar sua postura base.";
    processarVideo();
}

main();