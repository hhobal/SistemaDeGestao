// ======================================
// LOJA — CHECKOUT EM 3 ETAPAS
// ======================================
let stepAtual = 1;
let pagSelecionado = 'cartao';

function iniciarCheckout() {
  if (carrinho.length === 0) { toast('Adicione produtos ao carrinho primeiro.', 'erro'); return; }
  if (!lojaClienteLogado()) {
    sessionStorage.setItem('loja_redirect','loja.html');
    window.location.href = 'loja-conta.html';
    return;
  }
  fecharPaineis();
  stepAtual = 1;
  pagSelecionado = 'cartao';
  atualizarSteps();
  mostrarPainel(1);
  preencherClienteInfo();
  preencherParcelas();
  preencherBoleto();
  const sessaoCliente = lojaCarregarCliente();
  document.getElementById('ckEndereco').value = sessaoCliente?.endereco || '';
  document.getElementById('modalCheckout').classList.add('open');
}

function fecharCheckout() {
  document.getElementById('modalCheckout').classList.remove('open');
}

function preencherClienteInfo() {
  const sessaoCliente = lojaCarregarCliente();
  document.getElementById('clienteInfo').innerHTML = `
    <strong>${sessaoCliente.nome}</strong><br>
    <span style="font-size:12px;color:var(--muted)">${sessaoCliente.email}</span>`;
}

function preencherParcelas() {
  const total = totalCarrinho();
  const sel = document.getElementById('ckParcelas');
  sel.innerHTML = '';
  for (let i = 1; i <= 6; i++) {
    const v = total / i;
    sel.innerHTML += `<option value="${i}">${i}× de ${fmt(v)}${i===1?' (à vista)':' sem juros'}</option>`;
  }
}

function preencherBoleto() {
  const d = new Date(); d.setDate(d.getDate() + 3);
  document.getElementById('boletoDt').textContent = d.toLocaleDateString('pt-BR');
}

function selecionarPag(tipo) {
  pagSelecionado = tipo;
  ['cartao','pix','boleto'].forEach(t => {
    document.getElementById('pag'+t.charAt(0).toUpperCase()+t.slice(1)).classList.toggle('active', t===tipo);
    document.getElementById('dados'+t.charAt(0).toUpperCase()+t.slice(1)).style.display = t===tipo ? '' : 'none';
  });
}

function atualizarSteps() {
  for (let i=1;i<=3;i++) {
    const el = document.getElementById('step'+i);
    el.classList.remove('active','done');
    if (i < stepAtual) el.classList.add('done');
    if (i === stepAtual) el.classList.add('active');
  }
  document.getElementById('btnVoltar').style.display = stepAtual > 1 ? '' : 'none';
  const btn = document.getElementById('btnAvancar');
  btn.disabled = false;
  if (stepAtual === 3) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar pedido'; }
  else { btn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right"></i>'; }
}

function mostrarPainel(n) {
  [1,2,3].forEach(i => document.getElementById('painel'+i).style.display = i===n?'':'none');
  document.getElementById('painelSucesso').style.display = 'none';
  document.getElementById('checkoutFooter').style.display = '';
}

function avancarStep() {
  if (stepAtual === 1) {
    const end = document.getElementById('ckEndereco').value.trim();
    if (!end) { document.getElementById('ckEndereco').style.borderColor='var(--danger)'; return; }
    document.getElementById('ckEndereco').style.borderColor='';
    stepAtual = 2;
    atualizarSteps();
    mostrarPainel(2);
  } else if (stepAtual === 2) {
    stepAtual = 3;
    atualizarSteps();
    mostrarPainel(3);
    preencherResumo();
  } else if (stepAtual === 3) {
    finalizarPedido();
  }
}

function voltarStep() {
  if (stepAtual > 1) { stepAtual--; atualizarSteps(); mostrarPainel(stepAtual); }
}

function preencherResumo() {
  const total = totalCarrinho();
  document.getElementById('resumoItens').innerHTML = carrinho.map(i => `
    <div class="resumo-item">
      <span>${i.nome} ×${i.qtd}</span>
      <span>${fmt(i.preco * i.qtd)}</span>
    </div>`).join('');
  const pagNome = { cartao:'Cartão de crédito', pix:'PIX', boleto:'Boleto' };
  document.getElementById('resumoTotal').innerHTML = `
    <div class="resumo-item"><span style="color:var(--muted)">Pagamento</span><span>${pagNome[pagSelecionado]}</span></div>
    <div class="resumo-total"><span>Total</span><span style="color:var(--success)">${fmt(total)}</span></div>`;
}

async function finalizarPedido() {
  const btn = document.getElementById('btnAvancar');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando pedido...';

  const parcelas = pagSelecionado === 'cartao' ? parseInt(document.getElementById('ckParcelas').value) : 1;

  const payload = {
    itensCarrinho: carrinho.map(i => ({ produtoId: i.produtoId, quantidade: i.qtd })),
    enderecoEntrega: document.getElementById('ckEndereco').value.trim(),
    pagamento: pagSelecionado,
    parcelas
  };

  try {
    const pedido = await lojaCriarPedido(payload);

    carrinho = [];
    lojaLimparCarrinho();
    renderizarCarrinho();
    document.getElementById('nroPedidoSucesso').textContent = `Pedido #${pedido.numero}`;
    [1,2,3].forEach(i => document.getElementById('painel'+i).style.display='none');
    document.getElementById('painelSucesso').style.display='';
    document.getElementById('checkoutFooter').style.display='none';
    ['step1','step2','step3'].forEach(s => {
      document.getElementById(s).classList.remove('active');
      document.getElementById(s).classList.add('done');
    });
  } catch (erro) {
    // Erro comum aqui: estoque insuficiente entre o momento em que o
    // produto foi visto na vitrine e a confirmação do pedido (o backend
    // sempre revalida o estoque na hora de criar o pedido).
    toast(erro.message || 'Não foi possível finalizar o pedido.', 'erro');
    btn.disabled = false;
    atualizarSteps();
  }
}

// ─── MÁSCARAS (só visuais — o pagamento é simulado; o backend não recebe dados de cartão) ──
function mascaraCartao(el) {
  let v = el.value.replace(/\D/g,'').slice(0,16);
  v = v.match(/.{1,4}/g)?.join(' ') || v;
  el.value = v;
}
function mascaraValidade(el) {
  let v = el.value.replace(/\D/g,'').slice(0,4);
  if (v.length>2) v = v.slice(0,2)+'/'+v.slice(2);
  el.value = v;
}
