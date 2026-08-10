// ======================================
// LOJA — FAVORITOS
// ======================================
function atualizarBadgeFavoritos() {
  const favoritos = lojaCarregarFavoritos();
  const badge = document.getElementById('favBadge');
  badge.textContent = favoritos.length;
  badge.style.display = favoritos.length > 0 ? 'flex' : 'none';
  document.getElementById('statFavoritos').textContent = favoritos.length;
}

function toggleFavorito(id, ev) {
  if (ev) ev.stopPropagation();
  const p = produtosCatalogo.find(x => x.id === id);
  const ficouFavorito = lojaAlternarFavorito(id);
  atualizarBadgeFavoritos();
  processarEExibir();
  renderizarFavoritosPanel();
  if (p) toast(ficouFavorito ? `${p.nome} adicionado aos favoritos.` : `${p.nome} removido dos favoritos.`, ficouFavorito ? 'ok' : 'info');
}

function toggleFavoritosPanel() {
  fecharPaineis(true);
  document.getElementById('favoritosPanel').classList.toggle('open');
  document.getElementById('carrinhoOverlay').classList.toggle('open');
  renderizarFavoritosPanel();
}

function renderizarFavoritosPanel() {
  const cont = document.getElementById('favoritosItens');
  const ids = lojaCarregarFavoritos();
  const itens = ids.map(id => produtosCatalogo.find(p => p.id === id)).filter(Boolean);

  if (itens.length === 0) {
    cont.innerHTML = `<div class="carrinho-vazio"><i class="fa-solid fa-heart"></i>Você ainda não favoritou nada.<br>Toque no coração de um produto para salvá-lo aqui.</div>`;
    return;
  }
  cont.innerHTML = itens.map(p => `
    <div class="fav-item">
      <div class="fav-item-img ${gradClasseDoProduto(p)}">${emojiDoProduto(p)}</div>
      <div class="fav-item-info">
        <div class="fav-item-nome">${p.nome}</div>
        <div class="fav-item-preco">${fmt(p.preco)}</div>
      </div>
      <div class="fav-item-acoes">
        <button class="icon-btn-sm" title="Adicionar ao carrinho" onclick="addCarrinho(${p.id})" ${Number(p.estoque||0)<=0?'disabled':''}><i class="fa-solid fa-cart-plus"></i></button>
        <button class="icon-btn-sm danger" title="Remover" onclick="toggleFavorito(${p.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

function alternarSoFavoritos() {
  soFavoritos = !soFavoritos;
  document.getElementById('btnSoFavoritos').classList.toggle('active', soFavoritos);
  processarEExibir();
}
