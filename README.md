# Aligna — Monitor de Postura & Fadiga Ocular

Uma aplicação web focada em ergonomia digital e saúde ocular para desenvolvedores e profissionais que passam longos períodos em frente às telas. Utiliza visão computacional e inteligência artificial no cliente para monitorar a frequência de piscadas por minuto (PPM) e a distância do usuário em relação ao monitor em tempo real.

---

## Funcionalidades

* **Detecção Facial em Tempo Real:** Rastreamento de pontos da malha facial (*MediaPipe FaceMesh*) processado 100% no navegador via GPU.
* **Cálculo de EAR (Eye Aspect Ratio):** Algoritmo geométrico para detecção precisa do fechamento e abertura dos olhos.
* **Detecção Inteligente de Presença:** Pausa e congela os ciclos de medição quando o usuário não estiver em frente à tela, reiniciando o ciclo de 60s apenas ao retornar.
* **Monitoramento de Postura & Distância:** Cálculo contínuo da distância interpupilar/facial com alertas graduais para aproximação excessiva.
* **Calibração Dinâmica:** Calibração com um clique que define tanto a distância base em pixels quanto o limiar personalizado de EAR.
* **Alertas Visuais, Sonoros e Nativos:** Notificações na interface (toasts/banners), alertas em áudio e notificações nativas do navegador via *Notification API*.
* **Modo Flutuante (Picture-in-Picture):** Suporte a PiP para continuar o acompanhamento da câmera em segundo plano enquanto utiliza outros softwares.
* **Painel de Métricas & Histórico:** 
  * Gráfico interativo com a evolução do PPM (Chart.js).
  * Registro em memória dos alertas de postura da sessão ativa.
* **Interface Responsiva & Touch-Lock:** Layout sem distorção anamórfica, suporte nativo para câmeras frontais em modo retrato (smartphones) e travamento de overscroll.
* **Privacidade Total (*Client-Side*):** Nenhum frame de vídeo ou dado biométrico sai da máquina do usuário.

---

## Tecnologias Utilizadas

* **Linguagens:** HTML5, CSS3 Moderno (Custom Properties, Flexbox, Aspect-Ratio), JavaScript ES6+ (Módulos Nativos)
* **Inteligência Artificial & Visão Computacional:** `@tensorflow/tfjs` e `@tensorflow-models/face-landmarks-detection` (MediaPipe FaceMesh)
* **Visualização de Dados:** `Chart.js`
* **APIs Web:** `MediaDevices (getUserMedia)`, `Picture-in-Picture API`, `Web Notifications API`, `Web Audio`

---

## Estrutura do Projeto

```text
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── image/
│   │   ├── attention.svg
│   │   ├── camera.svg
│   │   ├── close.svg
│   │   ├── correctposturedark.jpg
│   │   ├── correctposturewhite.jpg
│   │   ├── historico.png
│   │   ├── line-chart.svg
│   │   ├── line.svg
│   │   ├── logo.svg
│   │   └── pip.svg
│   └── sounds/
│       ├── pertodatela.mp3
│       └── piscando.mp3
├── js/
│   ├── modules/
│   │   ├── audio.js
│   │   ├── blink.js
│   │   ├── camera.js
│   │   ├── charts.js
│   │   ├── geometry.js
│   │   ├── modal.js
│   │   ├── notifications.js
│   │   ├── pip.js
│   │   ├── posture.js
│   │   ├── postureHistory.js
│   │   └── sidebar.js
│   └── main.js
├── index.html
└── README.md