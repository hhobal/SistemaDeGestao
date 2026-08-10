// ======================================
// LOJA — CATÁLOGO, FILTROS E VITRINE
// ======================================
function registrarEExibirRecente(id) {
  lojaRegistrarRecente(id);
  renderizarRecentes();
}

function renderizarRecentes() {
  const ids = lojaCarregarRecentes();
  const secao = document.getElementById('secaoRecentes');
  const cont = document.getElementById('recentesScroll');
  const itens = ids.map(id => produtosCatalogo.find(p => p.id === id)).filter(Boolean);

  if (itens.length === 0) { secao.style.display = 'none'; return; }
  secao.style.display = '';
  cont.innerHTML = itens.map(p => `
    <div class="recente-card" onclick="abrirQuickView(${p.id})">
      <div class="recente-img ${gradClasseDoProduto(p)}">${emojiDoProduto(p)}</div>
      <div class="recente-body">
        <div class="recente-nome">${p.nome}</div>
        <div class="recente-preco">${fmt(p.preco)}</div>
      </div>
    </div>`).join('');
}

// ─── VIEW GRID/LISTA ────────────────────

function alternarView(v) {
  viewAtual = v;
  document.getElementById('gridProdutos').classList.toggle('modo-lista', v === 'lista');
  document.getElementById('btnViewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('btnViewLista').classList.toggle('active', v === 'lista');
}

// ─── PRODUTOS (vindos da API) ──────────

let catAtiva = '';
let buscaDebounceId = null;

function setCategoria(cat) {
  catAtiva = cat;
  document.querySelectorAll('.filtro-tag').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
  carregarProdutosNaTela();
}

function filtrarProdutos() {
  clearTimeout(buscaDebounceId);
  buscaDebounceId = setTimeout(() => carregarProdutosNaTela(), 300);
}

function mostrarSkeleton() {
  const grid = document.getElementById('gridProdutos');
  grid.classList.remove('modo-lista');
  grid.innerHTML = Array.from({length:8}).map(() => `
    <div class="skeleton-card">
      <div class="skeleton-img skeleton-shimmer"></div>
      <div class="skeleton-line skeleton-shimmer w40"></div>
      <div class="skeleton-line skeleton-shimmer w60"></div>
      <div class="skeleton-line skeleton-shimmer w40" style="margin-bottom:14px"></div>
    </div>`).join('');
}

async function carregarProdutosNaTela() {
  const grid = document.getElementById('gridProdutos');
  const busca = document.getElementById('buscaProd').value.trim();
  mostrarSkeleton();

  try {
    const [produtos, categorias] = await Promise.all([
      lojaCarregarProdutos({ busca, categoria: catAtiva }),
      lojaCarregarCategorias()
    ]);
    produtosCatalogo = produtos;
    _desenharFiltrosCategorias(categorias);
    _atualizarFiltroPreco();
    atualizarBadgeFavoritos();
    renderizarRecentes();
    document.getElementById('statProdutos').textContent = produtos.length;
    document.getElementById('statCategorias').textContent = categorias.length;
    processarEExibir();
  } catch (erro) {
    grid.innerHTML = `<div class="estado-vazio"><i class="fa-solid fa-triangle-exclamation"></i>${erro.message}</div>`;
  }
}

function _desenharFiltrosCategorias(categorias) {
  const filtrosCont = document.getElementById('filtrosCats');
  filtrosCont.innerHTML = `<span class="filtro-tag ${!catAtiva?'active':''}" onclick="setCategoria('')" data-cat="">Todos</span>`;
  categorias.forEach(c => {
    filtrosCont.innerHTML += `<span class="filtro-tag ${catAtiva===c?'active':''}" onclick="setCategoria('${c}')" data-cat="${c}">${EMOJI_CAT[c]||''} ${c}</span>`;
  });
}

function _atualizarFiltroPreco() {
  const range = document.getElementById('filtroPrecoRange');
  const maxPreco = produtosCatalogo.length ? Math.max(...produtosCatalogo.map(p => Number(p.preco||0))) : 0;
  const valorAnterior = Number(range.value);
  range.max = Math.ceil(maxPreco) || 1;
  // mantém o valor escolhido pelo usuário se ainda fizer sentido; senão, reseta pro máximo
  range.value = (valorAnterior > 0 && valorAnterior < range.max) ? valorAnterior : range.max;
  document.getElementById('precoMaxLabel').textContent = fmt(range.value);
}

function aplicarFiltroPreco() {
  document.getElementById('precoMaxLabel').textContent = fmt(document.getElementById('filtroPrecoRange').value);
  processarEExibir();
}

function processarEExibir() {
  const precoMax = Number(document.getElementById('filtroPrecoRange').value || Infinity);
  const ordenacao = document.getElementById('selectOrdenacao').value;
  const favoritos = lojaCarregarFavoritos();

  let lista = produtosCatalogo.filter(p => Number(p.preco||0) <= precoMax);
  if (soFavoritos) lista = lista.filter(p => favoritos.includes(p.id));

  lista = [...lista].sort((a,b) => {
    switch (ordenacao) {
      case 'nome-desc': return b.nome.localeCompare(a.nome);
      case 'preco-asc': return a.preco - b.preco;
      case 'preco-desc': return b.preco - a.preco;
      case 'estoque-desc': return b.estoque - a.estoque;
      default: return a.nome.localeCompare(b.nome);
    }
  });

  produtosExibidos = lista;
  document.getElementById('resultadoInfo').textContent =
    `${lista.length} ${lista.length===1?'produto encontrado':'produtos encontrados'}` + (soFavoritos ? ' em favoritos' : '');
  _desenharGridProdutos(lista);
}

function _desenharGridProdutos(produtos) {
  const grid = document.getElementById('gridProdutos');
  grid.classList.toggle('modo-lista', viewAtual === 'lista');
  const favoritos = lojaCarregarFavoritos();

  if (produtos.length === 0) {
    grid.innerHTML = `<div class="estado-vazio">
      <i class="fa-solid fa-magnifying-glass"></i>
      Nenhum produto encontrado com esses filtros.
      <div><button class="btn-p btn-p-sec" onclick="limparFiltros()">Limpar filtros</button></div>
    </div>`;
    return;
  }

  grid.innerHTML = produtos.map(p => {
    const sem = estoqueBaixo(p);
    const novo = ehProdutoNovo(p);
    const ehFav = favoritos.includes(p.id);
    return `
    <div class="produto-card" onclick="abrirQuickView(${p.id})">
      <div class="produto-img ${gradClasseDoProduto(p)}">
        ${novo ? `<span class="produto-badge novo">Novo</span>` : (sem ? `<span class="produto-badge baixo">Últimas unid.</span>` : '')}
        <button class="btn-fav ${ehFav?'ativo':''}" onclick="toggleFavorito(${p.id}, event)" title="Favoritar"><i class="fa-solid fa-heart"></i></button>
        <span style="position:relative;z-index:1">${emojiDoProduto(p)}</span>
        <span class="btn-quickview" onclick="event.stopPropagation();abrirQuickView(${p.id})"><i class="fa-solid fa-eye"></i> Visualizar</span>
      </div>
      <div class="produto-body">
        <div class="produto-cat">${p.categoria || '—'}</div>
        <div class="produto-nome">${p.nome}</div>
        <div class="produto-desc">${p.descricao || 'Sem descrição adicional.'}</div>
        <div class="produto-footer">
          <div>
            <div class="produto-preco">${fmt(p.preco)}</div>
            <div class="produto-estoque">${sem ? 'Restam apenas '+p.estoque : 'Em estoque: '+p.estoque}</div>
          </div>
          <button class="btn-add" onclick="event.stopPropagation();addCarrinho(${p.id})" ${Number(p.estoque||0)<=0?'disabled':''} title="Adicionar ao carrinho">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function limparFiltros() {
  document.getElementById('buscaProd').value = '';
  soFavoritos = false;
  document.getElementById('btnSoFavoritos').classList.remove('active');
  const range = document.getElementById('filtroPrecoRange');
  range.value = range.max;
  document.getElementById('precoMaxLabel').textContent = fmt(range.value);
  setCategoria('');
}
