// ======================================
// LOJA — SESSÃO DO CLIENTE
// ======================================
function carregarSessaoNaTela() {
  const sessaoCliente = lojaCarregarCliente();
  const nav = document.getElementById('navUser');
  if (sessaoCliente) {
    nav.innerHTML = html`
      <span style="font-size:13px;color:var(--muted)">Olá, <strong style="color:var(--text)">${sessaoCliente.nome.split(' ')[0]}</strong></span>
      <a class="nav-btn" href="loja-conta.html"><i class="fa-solid fa-receipt"></i> Meus pedidos</a>
      <button class="nav-btn" onclick="fazerLogout()"><i class="fa-solid fa-right-from-bracket"></i> Sair</button>`;
  } else {
    nav.innerHTML = html`<a class="nav-btn nav-btn-accent" href="loja-conta.html" onclick="sessionStorage.setItem('loja_redirect','loja.html')"><i class="fa-solid fa-user"></i> Entrar / Cadastrar</a>`;
  }
}

function fazerLogout() {
  lojaLogout();
  carregarSessaoNaTela();
  toast('Você saiu da conta.', 'info');
}
