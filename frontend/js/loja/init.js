// ======================================
// LOJA — INICIALIZAÇÃO
// ======================================
window.addEventListener('click', e => {
  if (e.target === document.getElementById('modalCheckout')) fecharCheckout();
  if (e.target === document.getElementById('modalQuickView')) fecharQuickView();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { fecharCheckout(); fecharQuickView(); fecharPaineis(); }
});

carrinho = lojaCarregarCarrinho();
carregarSessaoNaTela();
renderizarCarrinho();
carregarProdutosNaTela();
