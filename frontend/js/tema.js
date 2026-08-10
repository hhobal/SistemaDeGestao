// ======================================
// TEMA - DARK / LIGHT
// ======================================

function alternarTema() {
    document.body.classList.toggle('light-theme');
    const t = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    salvarTema(t);
    atualizarIconeTema();
}

function aplicarTemaSalvo() {
    document.body.classList.remove('light-theme');
    if (carregarTema() === 'light') document.body.classList.add('light-theme');
    atualizarIconeTema();
}

function atualizarIconeTema() {
    const btn = document.querySelector('#themeBtn i');
    if (!btn) return;
    btn.className = document.body.classList.contains('light-theme')
        ? 'fa-solid fa-sun'
        : 'fa-solid fa-moon';
}

document.addEventListener('DOMContentLoaded', aplicarTemaSalvo);
