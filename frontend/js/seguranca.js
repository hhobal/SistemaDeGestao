// ======================================
// ESCAPE DE HTML — PROTEÇÃO CONTRA XSS
// ======================================
// Todo dado vindo do banco é texto que o usuário digitou em algum
// momento, e boa parte dele vem de fora: qualquer visitante cria conta
// na loja escolhendo o próprio nome. Interpolar isso direto em
// innerHTML executa o que o visitante escrever.
//
// Cenário real que isto impede: alguém se cadastra na loja com o nome
//   <img src=x onerror="...rouba o localStorage...">
// e o script roda quando o administrador abre a tela de Clientes — com
// a sessão do administrador, que fica no localStorage.
//
// USO — troque o template literal comum pelo marcado com `html`:
//
//   elemento.innerHTML = html`<td>${cliente.nome}</td>`;
//
// Toda interpolação é escapada automaticamente. Para inserir HTML de
// propósito, o valor precisa vir de outro `html` — assim o padrão
// seguro é o mais fácil de escrever, e inserir HTML é sempre explícito:
//
//   html`<td>${cpf ? html`<span>${cpf}</span>` : ''}</td>`
//
// Arrays são concatenados item a item, o que cobre o padrão
// `${lista.map(item => html`<li>${item.nome}</li>`)}`.

// Marca um trecho como HTML já pronto, que não deve ser escapado de novo.
class HtmlSeguro {
    constructor(texto) { this.texto = texto; }
    toString() { return this.texto; }
}

function escaparHtml(valor) {
    if (valor === null || valor === undefined) return '';
    if (valor instanceof HtmlSeguro) return valor.texto;
    if (Array.isArray(valor)) return valor.map(escaparHtml).join('');

    return String(valor)
        .replace(/&/g, '&amp;')   // precisa ser o primeiro
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function html(partes, ...valores) {
    let saida = partes[0];
    for (let i = 0; i < valores.length; i++) {
        saida += escaparHtml(valores[i]) + partes[i + 1];
    }
    return new HtmlSeguro(saida);
}

// Disponível globalmente: as páginas carregam os scripts sem bundler.
window.html = html;
window.escaparHtml = escaparHtml;
window.HtmlSeguro = HtmlSeguro;
