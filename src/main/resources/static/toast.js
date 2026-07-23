(function () {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);

    window.showToast = function (msg, tipo, duracao) {
        tipo    = tipo    || 'sucesso';
        duracao = duracao || 3000;

        const toast = document.createElement('div');
        toast.className   = 'toast toast-' + tipo;
        toast.textContent = msg;
        container.appendChild(toast);

        requestAnimationFrame(function () { toast.classList.add('toast-visivel'); });

        setTimeout(function () {
            toast.classList.remove('toast-visivel');
            toast.addEventListener('transitionend', function () { toast.remove(); });
        }, duracao);
    };
})();
