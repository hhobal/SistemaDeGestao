// ======================================
// LOJA — FORMATAÇÃO, ÍCONES E NOTIFICAÇÕES
// ======================================
function fmt(v) { return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

const EMOJI_CAT = { 'Peças':'🔧','Serviço de mão de obra':'👷','Insumos':'🧪','Equipamentos':'⚙️','Acessórios':'🎁','Outros':'📦' };

function emojiDoProduto(p) { return EMOJI_CAT[p.categoria] || '📦'; }

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s||'').length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
  return h;
}
function gradClasseDoProduto(p) { return 'grad-' + (hashStr(p.categoria || p.nome) % 8); }

function ehProdutoNovo(p) {
  if (!p.criadoEm) return false;
  const dias = (Date.now() - new Date(p.criadoEm).getTime()) / 86400000;
  return dias <= 14;
}
function estoqueBaixo(p) { return Number(p.estoque||0) <= (Number(p.estoqueMin||0) * 1.2 + 2); }

// ─── TOAST ─────────────────────────────
function toast(msg, tipo) {
  tipo = tipo || 'ok';
  const icones = { ok:'fa-circle-check', erro:'fa-circle-exclamation', info:'fa-circle-info' };
  const el = document.getElementById('toast');
  el.innerHTML = html`<i class="fa-solid ${icones[tipo]}"></i> ${msg}`;
  el.className = `toast toast-${tipo} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
