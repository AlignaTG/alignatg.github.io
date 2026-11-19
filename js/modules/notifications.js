let toastContainer = document.getElementById('toast-container');
if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

export function solicitarPermissaoNotificacao() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

export function dispararNotificacaoNativa(titulo, corpo) {
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification(titulo, {
            body: corpo,
            icon: 'assets/image/logo.svg',
            badge: 'assets/image/attention.svg',
            tag: 'aligna-alerta',
            renotify: true
        });
    }
}

export function mostrarPopup(id, mensagem, tipo, duracaoAutoFechar = null) {
    let toast = document.getElementById(id);

    // Se o toast estava saindo, cancela a remoção e reaproveita o elemento
    if (toast && toast.timerRemocao) {
        clearTimeout(toast.timerRemocao);
        toast.timerRemocao = null;
        toast.classList.add('show');
    }

    if (!toast) {
        toast = document.createElement('div');
        toast.id = id;
        toast.className = `toast ${tipo}`;

        const texto = document.createElement('span');
        texto.className = 'toast-texto';
        texto.innerHTML = mensagem;

        const btnFechar = document.createElement('button');
        btnFechar.className = 'toast-fechar';
        btnFechar.setAttribute('aria-label', 'Fechar aviso');
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

export function fecharPopup(id) {
    const toast = document.getElementById(id);
    // Evita agendar várias remoções quando chamado a cada frame
    if (!toast || toast.timerRemocao) return;

    if (toast.timerAutoFechar) {
        clearTimeout(toast.timerAutoFechar);
        toast.timerAutoFechar = null;
    }
    toast.classList.remove('show');
    toast.timerRemocao = setTimeout(() => toast.remove(), 300);
}

/**
 * Fecha múltiplos popups de uma única vez
 * @param {string[]} ids
 */
export function fecharPopups(ids = []) {
    ids.forEach(id => fecharPopup(id));
}
