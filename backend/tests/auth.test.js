// ======================================
// AUTENTICAÇÃO — TESTES DE INTEGRAÇÃO (HTTP)
// ======================================
// Sobem a aplicação Express inteira via supertest e exercitam as rotas
// como o navegador faria, passando por middlewares, validação e banco.

const request = require('supertest');
const app = require('../src/app');
const { gerarTokenCliente } = require('../src/utils/jwt');
const { limparBanco, criarUsuario, criarCliente } = require('./helpers/db');

beforeEach(limparBanco);

describe('POST /api/auth/login', () => {
  it('devolve token e dados do usuário com credenciais corretas', async () => {
    await criarUsuario({ usuario: 'ana', senha: 'senhaCerta1', nome: 'Ana Souza' });

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'ana', senha: 'senhaCerta1' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.token).toBeTruthy();
    expect(resposta.body.usuario.nome).toBe('Ana Souza');
  });

  it('nunca expõe o hash da senha na resposta', async () => {
    await criarUsuario({ usuario: 'bruno', senha: 'senhaCerta1' });

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'bruno', senha: 'senhaCerta1' });

    expect(resposta.body.usuario.senhaHash).toBeUndefined();
    expect(JSON.stringify(resposta.body)).not.toContain('$2');
  });

  it('rejeita senha incorreta', async () => {
    await criarUsuario({ usuario: 'carla', senha: 'senhaCerta1' });

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'carla', senha: 'senhaErrada' });

    expect(resposta.status).toBe(401);
  });

  it('usa a mesma mensagem para usuário inexistente e senha errada', async () => {
    await criarUsuario({ usuario: 'diego', senha: 'senhaCerta1' });

    const senhaErrada = await request(app)
      .post('/api/auth/login').send({ usuario: 'diego', senha: 'xxxxxxx' });
    const usuarioInexistente = await request(app)
      .post('/api/auth/login').send({ usuario: 'naoexiste', senha: 'xxxxxxx' });

    // Mensagens diferentes revelariam quais logins existem no sistema.
    // A checagem de string não-vazia evita que o teste passe à toa
    // caso o formato do erro mude e os dois virem undefined.
    expect(senhaErrada.body.erro).toEqual(expect.any(String));
    expect(senhaErrada.body.erro.length).toBeGreaterThan(0);
    expect(senhaErrada.body.erro).toBe(usuarioInexistente.body.erro);
  });

  it('rejeita usuário desativado', async () => {
    await criarUsuario({ usuario: 'elena', senha: 'senhaCerta1', ativo: false });

    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'elena', senha: 'senhaCerta1' });

    expect(resposta.status).toBe(401);
  });

  it('rejeita corpo sem usuário ou senha', async () => {
    const resposta = await request(app).post('/api/auth/login').send({});
    expect(resposta.status).toBe(400);
  });
});

describe('Proteção das rotas do painel', () => {
  async function tokenDe(dados) {
    await criarUsuario({ usuario: 'logado', senha: 'senhaCerta1', ...dados });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ usuario: 'logado', senha: 'senhaCerta1' });
    return login.body.token;
  }

  it('bloqueia acesso sem token', async () => {
    const resposta = await request(app).get('/api/clientes');
    expect(resposta.status).toBe(401);
  });

  it('bloqueia token malformado', async () => {
    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', 'Bearer nao-e-um-jwt');
    expect(resposta.status).toBe(401);
  });

  it('bloqueia header sem o prefixo Bearer', async () => {
    const token = await tokenDe({});
    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', token);
    expect(resposta.status).toBe(401);
  });

  it('libera acesso com token válido', async () => {
    const token = await tokenDe({});
    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(200);
  });

  it('rejeita token de usuário que foi desativado depois do login', async () => {
    const token = await tokenDe({});

    const { prisma } = require('./helpers/db');
    await prisma.usuario.updateMany({ where: { usuario: 'logado' }, data: { ativo: false } });

    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);

    expect(resposta.status).toBe(401);
  });
});

describe('Isolamento entre painel e loja', () => {
  it('recusa token de cliente da loja em rota administrativa', async () => {
    const cliente = await criarCliente({ senha: 'senhaCliente1' });
    const tokenLoja = gerarTokenCliente(cliente);

    // Assinado com JWT_LOJA_SECRET — não pode abrir rota do painel,
    // que valida contra JWT_SECRET.
    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenLoja}`);

    expect(resposta.status).toBe(401);
  });
});

describe('Perfis de acesso', () => {
  async function loginCom(perfil) {
    await criarUsuario({ usuario: `u_${perfil}`, senha: 'senhaCerta1', perfil });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ usuario: `u_${perfil}`, senha: 'senhaCerta1' });
    return login.body.token;
  }

  it('permite leitura para o perfil Visitante', async () => {
    const token = await loginCom('Visitante');
    const resposta = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(resposta.status).toBe(200);
  });

  it('bloqueia escrita para o perfil Visitante', async () => {
    const token = await loginCom('Visitante');
    const resposta = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Cliente Novo' });
    expect(resposta.status).toBe(403);
  });

  it('permite escrita para o perfil Administrador', async () => {
    const token = await loginCom('Administrador');
    const resposta = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Cliente Novo' });

    expect(resposta.status).toBeLessThan(300);
    // O registro precisa ter sido realmente criado, não só aceito.
    expect(resposta.body.id).toEqual(expect.any(Number));
    expect(resposta.body.nome).toBe('Cliente Novo');
  });
});
