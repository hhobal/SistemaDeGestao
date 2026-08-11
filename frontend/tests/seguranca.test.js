// ======================================
// ESCAPE DE HTML — RENDERIZAÇÃO REAL NO DOM
// ======================================
// Os testes abaixo não checam a string produzida: injetam o resultado
// no DOM e perguntam ao navegador (jsdom) o que ele entendeu. É a
// diferença entre "a string parece segura" e "o navegador não executou
// nada" — que é o que realmente importa aqui.

const { carregarScript, montarDom } = require('./helpers/dom');

beforeAll(() => {
  carregarScript('js/seguranca.js');
});

beforeEach(() => {
  montarDom('<div id="alvo"></div>');
});

const ALVO = () => document.getElementById('alvo');

describe('escaparHtml', () => {
  it('neutraliza os caracteres que abrem tag e atributo', () => {
    expect(escaparHtml('<script>')).toBe('&lt;script&gt;');
    expect(escaparHtml('a"b')).toBe('a&quot;b');
    expect(escaparHtml("a'b")).toBe('a&#39;b');
  });

  it('escapa o & uma única vez', () => {
    // Se o & não for tratado primeiro, "&lt;" viraria "&amp;lt;".
    expect(escaparHtml('a&<b')).toBe('a&amp;&lt;b');
  });

  it('trata null e undefined como texto vazio', () => {
    expect(escaparHtml(null)).toBe('');
    expect(escaparHtml(undefined)).toBe('');
  });

  it('preserva o zero, que não é ausência de valor', () => {
    expect(escaparHtml(0)).toBe('0');
  });
});

describe('html`` no DOM', () => {
  it('não executa script vindo do nome de um cliente', () => {
    // O ataque real: qualquer visitante escolhe o próprio nome ao criar
    // conta na loja, e o painel exibe esse nome.
    const nome = '<img src=x onerror="window.__invadido = true">';
    ALVO().innerHTML = html`<td><strong>${nome}</strong></td>`;

    expect(window.__invadido).toBeUndefined();
    // Nenhuma <img> foi criada: o navegador leu tudo como texto.
    expect(ALVO().querySelector('img')).toBeNull();
    expect(ALVO().querySelector('strong').textContent).toBe(nome);
  });

  it('mantém a estrutura HTML que o template declara', () => {
    ALVO().innerHTML = html`<table><tr><td class="celula">${'Ana'}</td></tr></table>`;

    expect(ALVO().querySelector('td.celula')).not.toBeNull();
    expect(ALVO().querySelector('td.celula').textContent).toBe('Ana');
  });

  it('impede a fuga de um atributo', () => {
    // Fechar a aspa e emendar outro atributo é a forma clássica de
    // burlar escape que só cuida de < e >.
    const titulo = '" onmouseover="window.__invadido = true" x="';
    ALVO().innerHTML = html`<div id="d" title="${titulo}">ok</div>`;

    const div = document.getElementById('d');
    expect(div.getAttribute('onmouseover')).toBeNull();
    expect(div.getAttribute('title')).toBe(titulo);
  });

  it('permite HTML deliberado quando vem de outro html``', () => {
    const cpf = '111.222.333-44';
    ALVO().innerHTML = html`<td>${cpf ? html`<span class="cpf">${cpf}</span>` : ''}</td>`;

    expect(ALVO().querySelector('span.cpf')).not.toBeNull();
    expect(ALVO().querySelector('span.cpf').textContent).toBe(cpf);
  });

  it('escapa template comum aninhado — a falha aparece na tela', () => {
    // Esquecer o `html` no aninhamento produz texto visível em vez de
    // um buraco silencioso. É o comportamento desejado.
    ALVO().innerHTML = html`<td>${`<span>x</span>`}</td>`;

    expect(ALVO().querySelector('span')).toBeNull();
    expect(ALVO().textContent).toContain('<span>x</span>');
  });

  it('concatena arrays sem separador, preservando o HTML de cada item', () => {
    const linhas = [{ nome: 'Ana' }, { nome: '<b>Beto</b>' }];
    ALVO().innerHTML = html`<ul>${linhas.map(l => html`<li>${l.nome}</li>`)}</ul>`;

    const itens = ALVO().querySelectorAll('li');
    expect(itens).toHaveLength(2);
    expect(itens[0].textContent).toBe('Ana');
    // O segundo nome contém HTML, que precisa aparecer como texto.
    expect(itens[1].textContent).toBe('<b>Beto</b>');
    expect(itens[1].querySelector('b')).toBeNull();
    // Sem vírgula entre os itens (o que Array.toString() produziria).
    expect(ALVO().textContent).not.toContain(',');
  });
});
