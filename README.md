# Detector de Piscadas & Monitor de Postura

Uma aplicação web focada em ergonomia digital e saúde ocular para desenvolvedores e pessoas que passam longos períodos em frente às telas. Utiliza visão computacional e inteligência artificial para monitorar a taxa de piscadas por minuto (PPM) e a distância do usuário em relação à tela em tempo real.

---

## Funcionalidades

* **Detecção Facial em Tempo Real:** Rastreamento de pontos da malha facial (*FaceMesh*) processado 100% no navegador via GPU.
* **Cálculo de EAR (Eye Aspect Ratio):** Algoritmo para detecção e contagem precisa de piscadas.
* **Alertas Inteligentes:** Notificações visuais e sonoras quando a frequência de piscadas for baixa ou quando o usuário estiver muito próximo da tela.
* **Calibração de Postura:** Definição de uma distância de referência customizada através de captura.
* **Histórico e Gráficos:** Exibição do histórico de piscadas por minuto com visualização gráfica via Chart.js.
* **Privacidade Total:** Execução local sem envio de imagens ou streams para servidores externos.

---

## Tecnologias Utilizadas

* **HTML5 / CSS3 / JavaScript (ES6 Modules)**
* **TensorFlow.js & MediaPipe FaceMesh**
* **Chart.js**

---

## Estrutura do Projeto

```text
├── assets/
│   ├── css/
│   │   └── style.css
│   └── sounds/
│       ├── piscando.mp3
│       └── pertodatela.mp3
├── js/
│   └── main.js
├── index.html
└── README.md