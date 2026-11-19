// ============================================================================
// 1. BIBLIOTECAS EXTERNAS (TensorFlow.js & FaceMesh)
// ============================================================================
// Todas as libs fixadas na MESMA versão do tfjs-core. Sem o "?deps=", o esm.sh
// resolvia o face-landmarks-detection com tfjs-core 3.x — uma segunda cópia do
// TensorFlow ("Platform browser has already been set") separada do backend WebGL.
import 'https://esm.sh/@tensorflow/tfjs-core@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-converter@4.20.0?deps=@tensorflow/tfjs-core@4.20.0';
import 'https://esm.sh/@tensorflow/tfjs-backend-webgl@4.20.0?deps=@tensorflow/tfjs-core@4.20.0';
import * as faceLandmarksDetection from 'https://esm.sh/@tensorflow-models/face-landmarks-detection@1.0.5?deps=@tensorflow/tfjs-core@4.20.0,@tensorflow/tfjs-converter@4.20.0';

// ============================================================================
// 2. MÓDULOS INTERNOS
// ============================================================================
import { iniciarCamera, mensagemErroCamera } from './modules/camera.js';
import {
    INDEX_OLHO_EXTERNO_ESQ,
    INDEX_OLHO_EXTERNO_DIR,
    INDICES_OLHO_ESQUERDO,
    INDICES_OLHO_DIREITO,
    calcularEAR,
    calcularDistanciaFace
} from './modules/geometry.js';
import { calibrarDistancia, getDistanciaCalibrada, verificarAlertaPostura } from './modules/posture.js';
import {
    processarCicloTempo,
    registrarPiscada,
    setLimiteEar,
    getLimiteEar,
    alternarPausaSistema,
    getSistemaPausado
} from './modules/blink.js';
import { carregarAudio, tocarAudioRepeticoes } from './modules/audio.js';
import { registrarAvisoPostura } from './modules/postureHistory.js';
import { mostrarPopup, fecharPopup, fecharPopups, dispararNotificacaoNativa, solicitarPermissaoNotificacao } from './modules/notifications.js';
import { inicializarSidebar } from './modules/sidebar.js';
import { inicializarModal } from './modules/modal.js';
import { alternarPiP } from './modules/pip.js';
import { criarRelogioSegundoPlano, criarCapturadorQuadros } from './modules/background.js';

// ============================================================================
// 3. ELEMENTOS DA INTERFACE (DOM)
// ============================================================================
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas ? canvas.getContext('2d') : null;
const imgLoading = document.getElementById('img-loading');
const statusDiv = document.getElementById('status-container');
const statusPill = statusDiv ? statusDiv.closest('.status-pill') : null;
const earDiv = document.getElementById('ear-value');
const btnCalibrar = document.getElementById('btn-calibrar');
const distCalibradaDiv = document.getElementById('distancia-calibrada');
const btnPausa = document.getElementById('btn-pausa');
const telaDescanso = document.getElementById('tela-descanso');
const contadorDescanso = document.getElementById('contador-descanso');

const metricas = {
    piscadas: document.getElementById('metrica-piscadas'),
    ppm: document.getElementById('metrica-ppm'),
    ciclo: document.getElementById('metrica-ciclo'),
    distancia: document.getElementById('metrica-distancia'),
    distanciaUnidade: document.getElementById('metrica-distancia-unidade')
};

const COR_LANDMARKS = '#9cbce6';

let detector;

// Popups gerenciados pelo sistema
const TOASTS_SISTEMA = ['toast-postura', 'toast-postura-grande', 'toast-piscada'];

// ============================================================================
// 4. HELPERS DE UI
// ----------------------------------------------------------------------------
// Só tocam no DOM quando o valor muda — o loop roda a cada frame.
// ============================================================================
let ultimoStatus = '';

/**
 * Atualiza o indicador de status.
 * @param {string} texto
 * @param {'ok'|'alerta'|'pausado'|'ausente'|'descanso'|'erro'|'carregando'} estado
 */
function definirStatus(texto, estado) {
    if (!statusDiv) return;
    const chave = `${estado}|${texto}`;
    if (chave === ultimoStatus) return;
    ultimoStatus = chave;
    statusDiv.textContent = texto;
    if (statusPill) statusPill.dataset.estado = estado;
}

function definirTexto(el, valor) {
    if (el && el.textContent !== String(valor)) el.textContent = valor;
}

function atualizarMetricas(ciclo, distanciaAtual = null) {
    definirTexto(metricas.piscadas, ciclo.piscadasMinutoAtual);
    definirTexto(metricas.ppm, ciclo.minutosCompletos ? ciclo.piscadasUltimoMinuto : '--');
    definirTexto(metricas.ciclo, ciclo.tempoRestante);

    if (distanciaAtual === null) return;
    const base = getDistanciaCalibrada();
    if (base) {
        // Rosto maior que a base = mais perto da tela
        definirTexto(metricas.distancia, Math.round((distanciaAtual / base) * 100));
        definirTexto(metricas.distanciaUnidade, '% base');
    } else {
        definirTexto(metricas.distancia, Math.round(distanciaAtual));
        definirTexto(metricas.distanciaUnidade, 'px');
    }
}

// ============================================================================
// LOOP DE PROCESSAMENTO — primeiro plano (rAF) e segundo plano (Worker)
// ----------------------------------------------------------------------------
// Aba visível: requestAnimationFrame, sincronizado com a tela.
// Aba oculta/minimizada: rAF para de rodar, então um relógio em Web Worker
// (sem throttling) dispara os quadros, lidos direto da câmera via ImageCapture.
// ============================================================================
const INTERVALO_SEGUNDO_PLANO_MS = 66; // ~15 quadros/s: suficiente p/ piscadas de 80ms+

let processando = false;
let descansoNotificado = false;
let rafAtivo = false;
let capturadorQuadros = null;
let relogioSegundoPlano = null;

async function executarQuadro() {
    if (processando) return; // nunca roda duas inferências ao mesmo tempo
    processando = true;
    try {
        await processarVideo();
    } catch (err) {
        console.warn('Falha ao processar quadro:', err);
    } finally {
        processando = false;
    }
}

function loopPrimeiroPlano() {
    if (document.hidden) {
        rafAtivo = false;
        return;
    }
    rafAtivo = true;
    executarQuadro().finally(() => requestAnimationFrame(loopPrimeiroPlano));
}

function iniciarLoops() {
    capturadorQuadros = criarCapturadorQuadros(video.srcObject);

    relogioSegundoPlano = criarRelogioSegundoPlano(INTERVALO_SEGUNDO_PLANO_MS, () => {
        if (document.hidden) executarQuadro();
    });

    if (relogioSegundoPlano) {
        relogioSegundoPlano.iniciar();
    } else {
        // Sem Worker: fallback limitado (o navegador vai reduzir a frequência)
        setInterval(() => { if (document.hidden) executarQuadro(); }, INTERVALO_SEGUNDO_PLANO_MS);
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !rafAtivo) loopPrimeiroPlano();
    });

    loopPrimeiroPlano();
}

/**
 * Obtém a imagem a ser analisada. Em segundo plano o <video> pode congelar,
 * então lê o quadro direto da câmera quando o navegador permite.
 * @returns {Promise<{ fonte: any, liberar: () => void }>}
 */
async function obterQuadro() {
    if (document.hidden && capturadorQuadros) {
        const bitmap = await capturadorQuadros.capturar();
        if (bitmap) return { fonte: bitmap, liberar: () => bitmap.close() };
    }
    return { fonte: video, liberar: () => {} };
}

function esconderTelaDescanso() {
    if (telaDescanso && !telaDescanso.classList.contains('hidden')) {
        telaDescanso.classList.remove('active');
        telaDescanso.classList.add('hidden');
    }
}

// ============================================================================
// 5. CONTROLES DE INTERFACE (Modal, Sidebar & Pausa)
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

// Atalhos espalhados pela página (navbar, rodapé)
const ACOES = {
    historico: () => modalController.abrirModal(),
    pip: () => alternarPiP(video),
    calibrar: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        executarCalibracao();
    }
};

document.querySelectorAll('[data-acao]').forEach(el => {
    el.addEventListener('click', () => {
        const acao = ACOES[el.dataset.acao];
        if (acao) acao();
    });
});

if (btnPausa) {
    const textoPausa = btnPausa.querySelector('.btn-pausa-texto') || btnPausa;
    btnPausa.addEventListener('click', () => {
        const pausado = alternarPausaSistema();
        btnPausa.classList.toggle('is-pausado', pausado);
        textoPausa.textContent = pausado ? 'Retomar sistema' : 'Pausar sistema';
        definirStatus(pausado ? 'Sistema pausado' : 'Sistema retomado', pausado ? 'pausado' : 'ok');
    });
}

// ============================================================================
// 6. CALIBRAÇÃO (Distância Facial & Limiar EAR)
// ----------------------------------------------------------------------------
// Coleta várias amostras no próprio loop de vídeo (sem inferência concorrente)
// e usa a mediana — assim uma piscada durante a calibração não distorce o EAR.
// ============================================================================
const CALIBRACAO_AMOSTRAS = 20;
const CALIBRACAO_TIMEOUT_MS = 5000;
const CALIBRACAO_STORAGE_KEY = 'aligna:calibracao';

let coletaCalibracao = null; // { distancias: [], ears: [], inicio }

function mediana(valores) {
    const ordenados = [...valores].sort((a, b) => a - b);
    const meio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

function executarCalibracao() {
    if (!detector || coletaCalibracao) return;

    if (getSistemaPausado()) {
        mostrarPopup('toast-calibracao', 'Retome o sistema para calibrar.', 'toast-info', 3000);
        return;
    }

    coletaCalibracao = { distancias: [], ears: [], inicio: performance.now() };
    if (btnCalibrar) btnCalibrar.disabled = true;
    mostrarPopup('toast-calibracao', 'Calibrando… mantenha a postura ideal e olhe para a tela.', 'toast-info');
}

function coletarAmostraCalibracao(distancia, ear) {
    if (!coletaCalibracao) return;
    coletaCalibracao.distancias.push(distancia);
    coletaCalibracao.ears.push(ear);
    if (coletaCalibracao.distancias.length >= CALIBRACAO_AMOSTRAS) {
        finalizarCalibracao();
    }
}

function verificarTimeoutCalibracao() {
    if (coletaCalibracao && performance.now() - coletaCalibracao.inicio > CALIBRACAO_TIMEOUT_MS) {
        coletaCalibracao = null;
        if (btnCalibrar) btnCalibrar.disabled = false;
        mostrarPopup(
            'toast-calibracao',
            '<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Aviso"> Rosto não detectado! Posicione-se bem em frente à câmera e tente novamente.',
            'toast-postura',
            5000
        );
    }
}

function finalizarCalibracao() {
    const distancia = mediana(coletaCalibracao.distancias);
    // Usa o terço superior dos EARs (olho aberto) para não contaminar com piscadas
    const earsOrdenados = [...coletaCalibracao.ears].sort((a, b) => a - b);
    const earAberto = mediana(earsOrdenados.slice(Math.floor(earsOrdenados.length / 3)));
    coletaCalibracao = null;
    if (btnCalibrar) btnCalibrar.disabled = false;

    aplicarCalibracao(distancia, earAberto * 0.75);
    salvarCalibracao(distancia, getLimiteEar());
    mostrarPopup('toast-calibracao', 'Calibração concluída!', 'toast-info', 2500);
}

function aplicarCalibracao(distancia, limiteEar) {
    calibrarDistancia(distancia);
    setLimiteEar(limiteEar);

    if (distCalibradaDiv) {
        distCalibradaDiv.textContent = `base: ${distancia.toFixed(0)}px · ear: ${limiteEar.toFixed(3)}`;
        distCalibradaDiv.classList.add('calibrada');
    }

    if (btnCalibrar) {
        btnCalibrar.firstChild.textContent = 'Recalibrar postura ';
    }

    sidebarController.moverCalibracaoParaSidebar();
}

function salvarCalibracao(distancia, limiteEar) {
    try {
        localStorage.setItem(CALIBRACAO_STORAGE_KEY, JSON.stringify({
            distancia,
            limiteEar,
            largura: video.videoWidth,
            altura: video.videoHeight,
            data: new Date().toISOString()
        }));
    } catch { /* armazenamento indisponível (modo privado etc.) */ }
}

/**
 * Restaura a calibração anterior, desde que a resolução da câmera seja a mesma
 * (a distância em pixels depende da resolução).
 */
function restaurarCalibracao() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CALIBRACAO_STORAGE_KEY));
        if (!salvo || salvo.largura !== video.videoWidth || salvo.altura !== video.videoHeight) return false;
        if (!(salvo.distancia > 0) || !(salvo.limiteEar > 0)) return false;
        aplicarCalibracao(salvo.distancia, salvo.limiteEar);
        return true;
    } catch {
        return false;
    }
}

// ============================================================================
// 7. PIPELINE DE PROCESSAMENTO DE VÍDEO
// ============================================================================
async function processarVideo() {
    if (!detector || !video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || !ctx) {
        return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    verificarTimeoutCalibracao();

    // 1. Verificação de Pausa Manual
    if (getSistemaPausado()) {
        esconderTelaDescanso();
        verificarAlertaPostura(0);
        fecharPopups(TOASTS_SISTEMA);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        definirStatus('Sistema pausado', 'pausado');
        definirTexto(earDiv, '// monitoramento pausado');

        return;
    }

    // 2. Inferência facial
    let faces = [];
    const quadro = await obterQuadro();
    try {
        faces = await detector.estimateFaces(quadro.fonte);
    } catch (err) {
        console.warn("Falha momentânea na inferência do FaceMesh:", err);
    } finally {
        quadro.liberar();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const temRosto = Boolean(faces && faces.length > 0);
    const ciclo = processarCicloTempo(temRosto);

    // 3. Tela de Descanso Obrigatória
    if (ciclo.modoDescanso) {
        if (!descansoNotificado) {
            descansoNotificado = true;
            // Só aparece se a página estiver oculta/minimizada (ver dispararNotificacaoNativa)
            dispararNotificacaoNativa(
                "Aligna — Hora de descansar a vista",
                "Poucas piscadas em dois minutos seguidos. Feche os olhos ou olhe para longe por 20 segundos."
            );
        }
        if (telaDescanso) {
            telaDescanso.classList.add('active');
            telaDescanso.classList.remove('hidden');
        }
        definirTexto(contadorDescanso, `${ciclo.tempoDescansoRestante}s`);

        verificarAlertaPostura(0);
        fecharPopups(TOASTS_SISTEMA);
        definirStatus('Pausa obrigatória: descanse seus olhos', 'descanso');

        return;
    }

    descansoNotificado = false;
    esconderTelaDescanso();

    if (temRosto) {
        const pontos = faces[0].keypoints;

        if (!document.pictureInPictureElement) {
            ctx.fillStyle = COR_LANDMARKS;
            pontos.forEach(ponto => {
                ctx.fillRect(ponto.x, ponto.y, 1.5, 1.5);
            });
        }

        // Postura / Distância
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
                    `<img src="assets/image/attention.svg" class="toast-svg-icon-grande" alt="Perigo"> Muito perto da tela há ${statusPostura.segundosPerto}s! Corrija sua postura.`,
                    'toast-postura-grande',
                    3000
                );
            }
        } else {
            fecharPopup('toast-postura');
            fecharPopup('toast-postura-grande');
        }

        // EAR e Piscadas
        const pE = INDICES_OLHO_ESQUERDO.map(i => pontos[i]);
        const pD = INDICES_OLHO_DIREITO.map(i => pontos[i]);

        if (pE[5] && pD[5]) {
            const earEsquerdo = calcularEAR(pE[0], pE[1], pE[2], pE[3], pE[4], pE[5]);
            const earDireito = calcularEAR(pD[0], pD[1], pD[2], pD[3], pD[4], pD[5]);
            const earMedio = (earEsquerdo + earDireito) / 2;

            registrarPiscada(earMedio);
            coletarAmostraCalibracao(distanciaRostoAtual, earMedio);

            definirTexto(earDiv, `ear ${earMedio.toFixed(3)} · limiar ${getLimiteEar().toFixed(3)} · ${distanciaRostoAtual.toFixed(0)}px`);
        }

        atualizarMetricas(ciclo, distanciaRostoAtual);

        if (ciclo.novoAlertaDisparado) {
            tocarAudioRepeticoes('./assets/sounds/piscando.mp3', 3);
            dispararNotificacaoNativa(
                "Aligna — Poucas Piscadas!",
                `Detectadas apenas ${ciclo.piscadasUltimoMinuto} PPM. Lembre-se de piscar!`
            );
            mostrarPopup(
                'toast-piscada',
                `<img src="assets/image/attention.svg" class="toast-svg-icon" alt="Alerta"> Poucas piscadas no último minuto (${ciclo.piscadasUltimoMinuto} PPM). Pisque mais.`,
                'toast-piscada',
                8000
            );
        }

        if (statusPostura.alertaAtivo) {
            definirStatus('Muito perto da tela — afaste-se', 'alerta');
        } else if (ciclo.alertaAtivo) {
            definirStatus(`Poucas piscadas no último minuto (${ciclo.piscadasUltimoMinuto} PPM)`, 'alerta');
        } else if (!getDistanciaCalibrada()) {
            definirStatus('Monitorando piscadas — calibre para ativar a postura', 'ok');
        } else {
            definirStatus('Monitorando — tudo certo', 'ok');
        }

    } else {
        verificarAlertaPostura(0);
        fecharPopup('toast-postura');
        fecharPopup('toast-postura-grande');

        atualizarMetricas(ciclo);
        definirStatus('Ausente — contagem pausada', 'ausente');
        definirTexto(earDiv, '// aguardando rosto na câmera');
    }

}

// ============================================================================
// 8. INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================
async function main() {
    const overlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");

    if (overlay) overlay.style.display = "flex";
    if (loadingText) loadingText.innerText = "Iniciando câmera...";

    solicitarPermissaoNotificacao();
    carregarAudio('./assets/sounds/pertodatela.mp3');
    carregarAudio('./assets/sounds/piscando.mp3');

    let cameraIniciada = false;
    try {
        await iniciarCamera(video, canvas);
        cameraIniciada = true;

        if (loadingText) loadingText.innerText = "Carregando FaceMesh (GPU)...";
        definirStatus('Carregando FaceMesh (GPU)...', 'carregando');

        const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        detector = await faceLandmarksDetection.createDetector(model, {
            runtime: 'tfjs',
            refineLandmarks: true,
            maxFaces: 1
        });

        if (loadingText) loadingText.innerText = "Compilando rede neural na GPU...";
        try {
            await detector.estimateFaces(video);
        } catch (warmupErr) {
            console.warn("Warmup inicial em background:", warmupErr);
        }

        if (imgLoading) imgLoading.classList.add('hidden');
        if (overlay) overlay.style.display = "none";

        definirStatus(
            restaurarCalibracao()
                ? 'Pronto! Calibração anterior restaurada'
                : "Pronto! Clique em 'Calibrar postura ideal'",
            'ok'
        );

        iniciarLoops();

    } catch (err) {
        console.error("Falha na inicialização do sistema:", err);
        const mensagem = !cameraIniciada
            ? mensagemErroCamera(err)
            : "Erro ao carregar o sistema. Verifique sua conexão e recarregue a página.";
        if (overlay) overlay.classList.add('erro');
        if (loadingText) loadingText.innerText = mensagem;
        definirStatus(mensagem, 'erro');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
