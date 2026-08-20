// ============================================================================
// 1. IMPORTAÇÃO DE BIBLIOTECAS (Formato de Módulo Nativo)
// ============================================================================
import 'https://esm.sh/@tensorflow/tfjs-core@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-converter@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-backend-webgl@4.20.0';
import * as faceLandmarksDetection from 'https://esm.sh/@tensorflow-models/face-landmarks-detection@1.0.5';

// ============================================================================
// 2. CONFIGURAÇÕES E MAPEAMENTO DO DOM
// ============================================================================
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status-container');
const earDiv = document.getElementById('ear-value');
const btnCalibrar = document.getElementById('btn-calibrar');
const distCalibradaDiv = document.getElementById('distancia-calibrada');
const alertaPosturaDiv = document.getElementById('alerta-postura');

let detector;
let contadorPiscadasJanela = 0;
let olhoFechado = false;

// Configurações de Tempo e Alerta de Piscadas
const LIMITE_EAR = 0.1;
const PISCADAS_MINIMAS_POR_MINUTO = 10;
const JANELA_TEMPO_MS = 60000; // 1 minuto

let tempoInicioJanela = Date.now();
let piscadasUltimoMinuto = 0;
let alertaPiscadaAtivo = false;

// Configurações do Monitor de Postura / Distância
let distanciaPadraoPixel = null; // Variável fixa definida pelo botão de calibração
let inicioProximidadeExcessiva = null; // Cronômetro de postura
let alertaPosturaAtivo = false;
const TEMPO_LIMITE_POSTURA_MS = 60; // 2 minutos (120.000 ms)
const MARGEM_PROXIMIDADE = 1.15; // 15% maior em pixels já é considerado "muito perto"

// Landmarks para cálculo de distância da face (Canto externo do olho esquerdo e direito)
const INDEX_OLHO_EXTERNO_ESQ = 33;
const INDEX_OLHO_EXTERNO_DIR = 263;

// Índices dos pontos dos olhos para cálculo do EAR
const indicesOlhoEsquerdo = [33, 160, 158, 133, 153, 144];
const indicesOlhoDireito = [362, 385, 387, 263, 373, 380];

// ============================================================================
// 3. FUNÇÕES DA APLICAÇÃO
// ============================================================================

async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false
        });
        video.srcObject = stream;
        return new Promise((resolve) => video.onloadedmetadata = () => resolve(video));
    } catch (err) {
        statusDiv.style.color = "#ff4444";
        statusDiv.innerText = "Erro ao acessar a webcam. Verifique as permissões.";
        console.error(err);
    }
}

function calcularEAR(p1, p2, p3, p4, p5, p6) {
    const dVert1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const dVert2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
    const dHoriz = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    return (dVert1 + dVert2) / (2.0 * dHoriz);
}

// Calcula a distância euclidiana entre dois pontos faciais na imagem
function calcularDistanciaFace(pEsq, pDir) {
    return Math.hypot(pDir.x - pEsq.x, pDir.y - pEsq.y);
}

function atualizarContadorTempo() {
    const tempoDecorrido = Date.now() - tempoInicioJanela;
    const tempoRestanteSegundos = Math.max(0, Math.ceil((JANELA_TEMPO_MS - tempoDecorrido) / 1000));

    if (tempoDecorrido >= JANELA_TEMPO_MS) {
        piscadasUltimoMinuto = contadorPiscadasJanela;
        alertaPiscadaAtivo = piscadasUltimoMinuto < PISCADAS_MINIMAS_POR_MINUTO;
        contadorPiscadasJanela = 0;
        tempoInicioJanela = Date.now();
    }

    return tempoRestanteSegundos;
}

// Monitora e valida a proximidade do usuário em relação à calibração salva
function verificarPostura(distanciaAtual) {
    if (!distanciaPadraoPixel) return; // Só monitora se o usuário tiver calibrado

    const limiteMuitoPerto = distanciaPadraoPixel * MARGEM_PROXIMIDADE;

    // Se o rosto estiver mais largo/próximo que o limite tolerado
    if (distanciaAtual > limiteMuitoPerto) {
        if (!inicioProximidadeExcessiva) {
            inicioProximidadeExcessiva = Date.now(); // Inicia cronômetro de 2 min
        } else {
            const tempoMuitoPerto = Date.now() - inicioProximidadeExcessiva;
            if (tempoMuitoPerto >= TEMPO_LIMITE_POSTURA_MS) {
                alertaPosturaAtivo = true;
            }
        }
    } else {
        // Se voltou para a distância correta/saudável, reseta o alarme
        inicioProximidadeExcessiva = null;
        alertaPosturaAtivo = false;
    }

    // Exibe ou oculta alerta visual de postura
    if (alertaPosturaAtivo) {
        alertaPosturaDiv.classList.remove('hidden');
        alertaPosturaDiv.innerText = "🚨 ALERTA DE POSTURA: Você está muito perto da tela";
    } else {
        alertaPosturaDiv.classList.add('hidden');
    }
}

async function processarVideo() {
    if (video.readyState >= 2) {
        const faces = await detector.estimateFaces(video, { flipHorizontal: false });
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const tempoRestante = atualizarContadorTempo();

        if (faces && faces.length > 0) {
            const pontos = faces[0].keypoints;

            // Desenha os pontos verdes na tela
            pontos.forEach(ponto => {
                ctx.fillStyle = '#00ff88';
                ctx.fillRect(ponto.x, ponto.y, 1.5, 1.5);
            });

            // Separação dos pontos dos olhos
            const pE = indicesOlhoEsquerdo.map(i => pontos[i]);
            const pD = indicesOlhoDireito.map(i => pontos[i]);

            // Cálculo da Distância do Rosto
            const pEsqExterno = pontos[INDEX_OLHO_EXTERNO_ESQ];
            const pDirExterno = pontos[INDEX_OLHO_EXTERNO_DIR];
            const distanciaRostoAtual = calcularDistanciaFace(pEsqExterno, pDirExterno);

            // Verifica regra de postura de 2 minutos
            verificarPostura(distanciaRostoAtual);

            if (pE[5] && pD[5]) {
                const earEsquerdo = calcularEAR(pE[0], pE[1], pE[2], pE[3], pE[4], pE[5]);
                const earDireito = calcularEAR(pD[0], pD[1], pD[2], pD[3], pD[4], pD[5]);
                
                const earMedio = (earEsquerdo + earDireito) / 2;
                
                let distTexto = distanciaPadraoPixel ? `${distanciaRostoAtual.toFixed(0)}px (Base: ${distanciaPadraoPixel.toFixed(0)}px)` : `${distanciaRostoAtual.toFixed(0)}px`;
                earDiv.innerText = `EAR Médio: ${earMedio.toFixed(3)} | Distância: ${distTexto} | Ciclo: ${tempoRestante}s`;

                // Lógica de Detecção da Piscada
                if (earMedio < LIMITE_EAR) {
                    olhoFechado = true;
                } else {
                    if (olhoFechado) {
                        contadorPiscadasJanela++;
                        olhoFechado = false;
                    }
                }
            }

            // Atualização dos alertas no Painel Principal
            if (alertaPiscadaAtivo) {
                statusDiv.style.color = "#ff3333";
                statusDiv.innerText = `⚠️ ALERTA: Poucas piscadas no último min (${piscadasUltimoMinuto} PPM)! Pisque mais. | Atual: ${contadorPiscadasJanela}`;
            } else {
                statusDiv.style.color = "#00ff88";
                statusDiv.innerText = `Piscadas no min atual: ${contadorPiscadasJanela} | Último min: ${piscadasUltimoMinuto} PPM`;
            }

        } else {
            statusDiv.style.color = "#ffffff";
            statusDiv.innerText = "Posicione seu rosto em frente à câmera";
            earDiv.innerText = "EAR: -- | Distância: --";
        }
    }
    if (document.hidden) {
        // Quando a aba/janela estiver minimizada ou em segundo plano
        // Roda via setTimeout (~10 FPS) para não pausar
        setTimeout(processarVideo, 100);
    } else {
        // Quando a janela estiver ativa na tela, mantém fluído a 60 FPS
        requestAnimationFrame(processarVideo);
    }
}

// Botão para registrar a "foto" / calibração da posição ideal do usuário
btnCalibrar.addEventListener('click', async () => {
    if (!detector) return;

    const faces = await detector.estimateFaces(video, { flipHorizontal: false });
    if (faces && faces.length > 0) {
        const pontos = faces[0].keypoints;
        const pEsq = pontos[INDEX_OLHO_EXTERNO_ESQ];
        const pDir = pontos[INDEX_OLHO_EXTERNO_DIR];
        
        // Define a variável com o número fixo de referência
        distanciaPadraoPixel = calcularDistanciaFace(pEsq, pDir);
        
        // Reseta qualquer contador anterior
        inicioProximidadeExcessiva = null;
        alertaPosturaAtivo = false;

        distCalibradaDiv.innerText = `Distância base: ${distanciaPadraoPixel.toFixed(0)} px`;
        distCalibradaDiv.style.backgroundColor = "#1b4d3e";
        distCalibradaDiv.style.color = "#00ff88";
    } else {
        alert("Rosto não detectado! Posicione-se bem em frente à câmera para calibrar.");
    }
});

// ============================================================================
// 4. INICIALIZAÇÃO DO FLUXO (Main)
// ============================================================================
async function main() {
    await iniciarCamera();
    video.play();
    
    statusDiv.innerText = "Carregando FaceMesh (Aguarde)...";
    
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
    const detectorConfig = {
        runtime: 'tfjs',
        refineLandmarks: true,
        maxFaces: 1
    };
    
    detector = await faceLandmarksDetection.createDetector(model, detectorConfig);
    
    statusDiv.innerText = "Pronto! Clique em 'Calibrar' para registrar sua postura base.";
    tempoInicioJanela = Date.now();
    processarVideo();
}

main();