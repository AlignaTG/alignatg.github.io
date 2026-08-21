import { getHistoricoPiscadas } from './blink.js';

let instanciaGrafico = null;

export function renderizarGraficoPiscadas(canvasElement) {
    if (!canvasElement) return;

    const historico = getHistoricoPiscadas();

    if (instanciaGrafico) {
        instanciaGrafico.destroy();
    }

    const labels = historico.map(h => h.horarioFormatado || `Min ${h.minutoIndice}`);
    const dadosPiscadas = historico.map(h => h.piscadas);
    const dadosMeta = historico.map(h => h.metaMinima || 10);

    const ctxGrafico = canvasElement.getContext('2d');
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
                    ticks: { color: '#8d99ae', font: { size: 11 }, maxRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.06)' },
                    ticks: { color: '#8d99ae', font: { size: 11 }, stepSize: 5 }
                }
            }
        }
    });
}