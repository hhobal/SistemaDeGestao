// ======================================
// LOJA — VISUALIZAÇÃO RÁPIDA DO PRODUTO
// ======================================
let qvQtd = 1;
let qvProdutoId = null;

function abrirQuickView(id) {
  const p = produtosCatalogo.find(x => x.id === id);
  if (!p) return;
  qvProdutoId = id;
  qvQtd = 1;
  registrarEExibirRecente(id);

  const sem = estoqueBaixo(p);
  const novo = ehProdutoNovo(p);
  const ehFav = lojaCarregarFavoritos().includes(id);

  document.getElementById('qvConteudo').innerHTML = `
    <div class="qv-img ${gradClasseDoProduto(p)}">
      ${novo ? `<span class="produto-badge novo">Novo</span>` : (sem ? `<span class="produto-badge baixo">Últimas unid.</span>` : '')}
      <span style="position:relative;z-index:1">${emojiDoProduto(p)}</span>
    </div>
    <div>
      <div class="qv-cat">${p.categoria || '—'}</div>
      <div class="qv-nome">${p.nome}</div>
      <div class="qv-preco">${fmt(p.preco)}</div>
      <div class="qv-desc">${p.descricao || 'Este produto ainda não possui uma descrição detalhada cadastrada.'}</div>
      <div class="qv-estoque"><i class="fa-solid fa-boxes-stacked" style="color:${sem?'var(--warning)':'var(--muted)'}"></i> ${p.estoque} unidade(s) disponíveis</div>
      <div class="qv-acoes">
        <div class="qv-qtd">
          <button onclick="qvMudQtd(-1)">−</button>
          <span id="qvQtdLabel">1</span>
          <button onclick="qvMudQtd(1)">+</button>
        </div>
        <button class="btn-p btn-p-primary" onclick="adicionarDoQuickView()" ${Number(p.estoque||0)<=0?'disabled':''}><i class="fa-solid fa-cart-plus"></i> Adicionar</button>
        <button class="icon-btn-sm ${ehFav?'ativo':''}" style="width:38px;height:38px;color:${ehFav?'#ec4899':''}" onclick="toggleFavorito(${p.id});abrirQuickView(${p.id})" title="Favoritar"><i class="fa-solid fa-heart"></i></button>
      </div>
    </div>`;
  document.getElementById('modalQuickView').classList.add('open');
}

function qvMudQtd(delta) {
  const p = produtosCatalogo.find(x => x.id === qvProdutoId);
  if (!p) return;
  qvQtd = Math.max(1, Math.min(Number(p.estoque||1), qvQtd + delta));
  document.getElementById('qvQtdLabel').textContent = qvQtd;
}

function adicionarDoQuickView() {
  if (!qvProdutoId) return;
  addCarrinho(qvProdutoId, qvQtd);
  fecharQuickView();
}

function fecharQuickView() {
  document.getElementById('modalQuickView').classList.remove('open');
  qvProdutoId = null;
}
