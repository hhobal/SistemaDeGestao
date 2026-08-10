// ======================================
// LOJA — CARRINHO E PAINÉIS LATERAIS
// ======================================
function addCarrinho(id, qtdAdicionar = 1) {
  const p = produtosCatalogo.find(x => x.id === id);
  if (!p || Number(p.estoque||0) <= 0) return;
  const item = carrinho.find(x => x.produtoId === id);
  const maxQtd = Number(p.estoque);
  if (item) {
    if (item.qtd + qtdAdicionar > maxQtd) { toast('Quantidade máxima no estoque atingida.', 'erro'); return; }
    item.qtd += qtdAdicionar;
  } else {
    if (qtdAdicionar > maxQtd) { toast('Quantidade máxima no estoque atingida.', 'erro'); return; }
    carrinho.push({ produtoId: id, nome: p.nome, preco: Number(p.preco), qtd: qtdAdicionar, categoria: p.categoria });
  }
  lojaSalvarCarrinho(carrinho);
  renderizarCarrinho();
  toast(`${p.nome} adicionado ao carrinho!`, 'ok');
}

function removerCarrinho(id) {
  carrinho = carrinho.filter(x => x.produtoId !== id);
  lojaSalvarCarrinho(carrinho);
  renderizarCarrinho();
}

function mudQtd(id, delta) {
  const item = carrinho.find(x => x.produtoId === id);
  if (!item) return;
  const p = produtosCatalogo.find(x => x.id === id);
  if (delta > 0 && p && item.qtd >= Number(p.estoque)) { toast('Quantidade máxima no estoque atingida.', 'erro'); return; }
  item.qtd += delta;
  if (item.qtd <= 0) carrinho = carrinho.filter(x => x.produtoId !== id);
  lojaSalvarCarrinho(carrinho);
  renderizarCarrinho();
}

function totalCarrinho() { return carrinho.reduce((s,i) => s + i.preco * i.qtd, 0); }

function renderizarCarrinho() {
  const cont = document.getElementById('carrinhoItens');
  const badge = document.getElementById('cartBadge');
  const totalEl = document.getElementById('carrinhoTotal');
  const btnFinalizar = document.getElementById('btnFinalizarCarrinho');
  const total = totalCarrinho();

  const qtdTotal = carrinho.reduce((s,i)=>s+i.qtd,0);
  badge.textContent = qtdTotal;
  badge.style.display = carrinho.length > 0 ? 'flex' : 'none';
  totalEl.textContent = fmt(total);
  btnFinalizar.disabled = carrinho.length === 0;

  if (carrinho.length === 0) {
    cont.innerHTML = `<div class="carrinho-vazio"><i class="fa-solid fa-cart-shopping"></i>Seu carrinho está vazio.<br>Adicione produtos para começar.</div>`;
    return;
  }
  cont.innerHTML = carrinho.map(i => `
    <div class="carrinho-item">
      <div class="carrinho-item-img ${'grad-' + (hashStr(i.categoria||i.nome) % 8)}">${EMOJI_CAT[i.categoria] || '📦'}</div>
      <div class="carrinho-item-info">
        <div class="carrinho-item-nome">${i.nome}</div>
        <div class="carrinho-item-preco">${fmt(i.preco * i.qtd)}</div>
      </div>
      <div class="carrinho-item-qtd">
        <button class="qtd-btn" onclick="mudQtd(${i.produtoId},-1)">−</button>
        <span class="qtd-num">${i.qtd}</span>
        <button class="qtd-btn" onclick="mudQtd(${i.produtoId},1)">+</button>
        <button onclick="removerCarrinho(${i.produtoId})" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:12px;margin-left:4px"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`).join('');
}

function toggleCarrinho() {
  fecharPaineis(true);
  document.getElementById('carrinhoPanel').classList.toggle('open');
  document.getElementById('carrinhoOverlay').classList.toggle('open');
}
function fecharPaineis(mantendoOverlay) {
  document.getElementById('carrinhoPanel').classList.remove('open');
  document.getElementById('favoritosPanel').classList.remove('open');
  if (!mantendoOverlay) document.getElementById('carrinhoOverlay').classList.remove('open');
}
