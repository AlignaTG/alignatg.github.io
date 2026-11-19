/**
 * Efeitos de rolagem — mesmo sistema do portfólio (joaolatczuk.github.io).
 *
 * 1. Entrada em cascata: marca com data-shown os elementos [data-enter] e
 *    [data-enter-group] quando entram na tela (uma vez só). O CSS faz a animação.
 *    Sem JS a classe .js-reveal não existe no <html> e nada fica escondido.
 * 2. Menu ativo: destaca o link da seção que ocupa o meio da tela.
 *
 * Carregado como módulo separado do main.js, para não esperar o TensorFlow baixar.
 */

function iniciarRevelacao() {
    const alvos = document.querySelectorAll('[data-enter], [data-enter-group]');

    if (!('IntersectionObserver' in window)) {
        alvos.forEach(el => { el.dataset.shown = ''; });
        return;
    }

    const observer = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue;
            entrada.target.dataset.shown = '';
            observer.unobserve(entrada.target);
        }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    alvos.forEach(el => observer.observe(el));
}

function iniciarSecaoAtiva() {
    const links = [...document.querySelectorAll('.nav-links a.nav-link[href^="#"]')];
    const porId = new Map(links.map(link => [link.getAttribute('href').slice(1), link]));
    const secoes = [...porId.keys()].map(id => document.getElementById(id)).filter(Boolean);
    if (!secoes.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
            if (!entrada.isIntersecting) continue;
            links.forEach(link => link.classList.remove('active'));
            porId.get(entrada.target.id)?.classList.add('active');
        }
    }, { rootMargin: '-45% 0px -50% 0px' });

    secoes.forEach(secao => observer.observe(secao));
}

iniciarRevelacao();
iniciarSecaoAtiva();
