// ======================================
// ORIGENS AUTORIZADAS (CORS)
// ======================================
// Errar para o lado permissivo aqui abre a API para qualquer site
// executar requisições com a sessão de quem estiver logado. Errar para
// o lado restritivo derruba o próprio front-end. Os dois casos são
// testados.

const { criarVerificadorDeOrigem, paraRegex } = require('../src/config/cors');

/** Executa o verificador e devolve o veredito como booleano. */
function permite(verificador, origem) {
  let resultado;
  verificador(origem, (_erro, permitida) => {
    resultado = permitida;
  });
  return resultado;
}

describe('sem configuração', () => {
  it('libera qualquer origem quando a lista está vazia', () => {
    // Padrão do desenvolvimento local, onde o front pode subir em
    // qualquer porta.
    expect(criarVerificadorDeOrigem([])).toBe(true);
    expect(criarVerificadorDeOrigem(undefined)).toBe(true);
  });
});

describe('origens exatas', () => {
  const verificador = criarVerificadorDeOrigem([
    'http://localhost:5173',
    'https://gestiq.vercel.app'
  ]);

  it('aceita as que estão na lista', () => {
    expect(permite(verificador, 'http://localhost:5173')).toBe(true);
    expect(permite(verificador, 'https://gestiq.vercel.app')).toBe(true);
  });

  it('recusa as que não estão', () => {
    expect(permite(verificador, 'https://site-de-terceiro.com')).toBe(false);
  });

  it('distingue http de https', () => {
    expect(permite(verificador, 'https://localhost:5173')).toBe(false);
  });

  it('distingue a porta', () => {
    expect(permite(verificador, 'http://localhost:5174')).toBe(false);
  });

  it('aceita requisição sem cabeçalho Origin', () => {
    // curl, health check do Render e app nativo não mandam Origin, e
    // não passam por CORS. Recusar aqui derrubaria o monitoramento.
    expect(permite(verificador, undefined)).toBe(true);
  });
});

describe('curinga', () => {
  const verificador = criarVerificadorDeOrigem(['https://gestiq-*.vercel.app']);

  it('aceita os domínios de preview do projeto', () => {
    expect(permite(verificador, 'https://gestiq-a1b2c3.vercel.app')).toBe(true);
    expect(permite(verificador, 'https://gestiq-web-git-main.vercel.app')).toBe(true);
  });

  it('não atravessa ponto', () => {
    // Sem isso, um curinga de subdomínio viraria porta de entrada para
    // qualquer host abaixo dele.
    expect(permite(verificador, 'https://gestiq-x.evil.vercel.app')).toBe(false);
  });

  it('respeita o prefixo', () => {
    expect(permite(verificador, 'https://outroprojeto-a1b2.vercel.app')).toBe(false);
  });

  it('respeita o domínio final', () => {
    expect(permite(verificador, 'https://gestiq-a1b2.vercel.app.evil.com')).toBe(false);
  });
});

describe('paraRegex', () => {
  it('trata o ponto como literal, não como qualquer caractere', () => {
    const regex = paraRegex('https://app.exemplo.com');
    expect(regex.test('https://app.exemplo.com')).toBe(true);
    // Sem escapar, o ponto casaria com qualquer caractere e
    // "appXexemplo.com" passaria.
    expect(regex.test('https://appXexemplo.com')).toBe(false);
  });

  it('ancora nas duas pontas', () => {
    const regex = paraRegex('https://exemplo.com');
    expect(regex.test('https://exemplo.com.br')).toBe(false);
    expect(regex.test('prefixo-https://exemplo.com')).toBe(false);
  });
});

describe('combinação', () => {
  it('aceita exata e curinga na mesma configuração', () => {
    const verificador = criarVerificadorDeOrigem([
      'http://localhost:5173',
      'https://gestiq-*.vercel.app'
    ]);
    expect(permite(verificador, 'http://localhost:5173')).toBe(true);
    expect(permite(verificador, 'https://gestiq-abc.vercel.app')).toBe(true);
    expect(permite(verificador, 'https://qualquer.com')).toBe(false);
  });

  it('ignora espaços em volta das entradas', () => {
    // CORS_ORIGINS é uma lista separada por vírgula digitada à mão.
    const verificador = criarVerificadorDeOrigem(['  http://localhost:5173  ']);
    expect(permite(verificador, 'http://localhost:5173')).toBe(true);
  });
});
