import { getHistoricoPiscadas, PISCADAS_MINIMAS_POR_MINUTO } from './blink.js';

let instanciaGrafico = null;

export function renderizarGraficoPiscadas(canvasElement) {
    if (!canvasElement || typeof Chart === 'undefined') return;

    const historico = getHistoricoPiscadas();

    if (instanciaGrafico) {
        instanciaGrafico.destroy();
    }

    const labels = historico.map(h => h.horarioFormatado || `Min ${h.minutoIndice}`);
    const dadosPiscadas = historico.map(h => h.piscadas);
    const dadosMeta = historico.map(h => h.metaMinima ?? PISCADAS_MINIMAS_POR_MINUTO);

    const ctxGrafico = canvasElement.getContext('2d');
    const gradient = ctxGrafico.createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(30, 58, 95, 0.22)');
    gradient.addColorStop(1, 'rgba(30, 58, 95, 0)');

    instanciaGrafico = new Chart(ctxGrafico, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['Sem dados ainda'],
            datasets: [
                {
                    label: 'Piscadas por minuto',
                    data: dadosPiscadas.length > 0 ? dadosPiscadas : [0],
                    borderColor: '#1e3a5f',
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#1e3a5f',
                    pointBorderColor: '#ffffff'
                },
                {
                    label: 'Meta mínima',
                    data: dadosMeta.length > 0 ? dadosMeta : [PISCADAS_MINIMAS_POR_MINUTO],
                    borderColor: '#d64545',
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
                        color: '#3e4a5c',
                        font: { size: 12, family: "'Google Sans Flex', 'Inter Tight', sans-serif" },
                        boxWidth: 12,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#3e4a5c',
                    borderColor: 'rgba(15, 23, 42, 0.12)',
                    borderWidth: 1,
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#7a8699', font: { size: 11 }, maxRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(15, 23, 42, 0.06)' },
                    ticks: { color: '#7a8699', font: { size: 11 }, stepSize: 5 }
                }
            }
        }
    });
}