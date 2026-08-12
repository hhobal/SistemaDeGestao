// ======================================
// CLIENTE HTTP
// ======================================
// É a peça por onde passa toda comunicação com o servidor. Um erro aqui
// aparece em todas as telas ao mesmo tempo, então é onde o teste rende
// mais.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  api,
  ErroApi,
  gravarSessao,
  lerSessao,
  aoExpirarSessao,
  query,
  type Sessao
} from './api';

const SESSAO: Sessao = {
  token: 'token-de-teste',
  usuario: { id: 1, nome: 'Ana', usuario: 'ana', perfil: 'Administrador', ativo: true }
};

function responder(corpo: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('autenticação das requisições', () => {
  it('anexa o token quando existe sessão', async () => {
    gravarSessao(SESSAO);
    vi.mocked(fetch).mockResolvedValue(responder({ ok: true }));

    await api.get('/clientes');

    const [, opcoes] = vi.mocked(fetch).mock.calls[0];
    expect((opcoes?.headers as Record<string, string>).Authorization).toBe('Bearer token-de-teste');
  });

  it('não anexa token em rota pública', async () => {
    gravarSessao(SESSAO);
    vi.mocked(fetch).mockResolvedValue(responder({ ok: true }));

    await api.post('/auth/login', { usuario: 'x' }, { semAutenticacao: true });

    const [, opcoes] = vi.mocked(fetch).mock.calls[0];
    expect((opcoes?.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe('sessão expirada', () => {
  it('limpa o storage e avisa os interessados no 401', async () => {
    gravarSessao(SESSAO);
    const avisado = vi.fn();
    const cancelar = aoExpirarSessao(avisado);

    vi.mocked(fetch).mockResolvedValue(responder({ erro: 'Sessão inválida.' }, 401));

    await expect(api.get('/clientes')).rejects.toBeInstanceOf(ErroApi);

    expect(lerSessao()).toBeNull();
    expect(avisado).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it('para de avisar depois de cancelar a inscrição', async () => {
    const avisado = vi.fn();
    aoExpirarSessao(avisado)();

    vi.mocked(fetch).mockResolvedValue(responder({ erro: 'x' }, 401));
    await expect(api.get('/clientes')).rejects.toThrow();

    expect(avisado).not.toHaveBeenCalled();
  });
});

describe('tratamento de erro', () => {
  it('usa a mensagem que o servidor mandou', async () => {
    vi.mocked(fetch).mockResolvedValue(
      responder({ erro: 'Este cliente possui pedidos vinculados.' }, 409)
    );

    await expect(api.delete('/clientes/1')).rejects.toMatchObject({
      status: 409,
      message: 'Este cliente possui pedidos vinculados.'
    });
  });

  it('marca 401 e 403 como problema de autenticação', () => {
    expect(new ErroApi(401, 'x').ehAutenticacao).toBe(true);
    expect(new ErroApi(403, 'x').ehAutenticacao).toBe(true);
    expect(new ErroApi(409, 'x').ehAutenticacao).toBe(false);
  });

  it('traduz falha de rede em mensagem legível', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/clientes')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Não foi possível falar com o servidor')
    });
  });

  it('deixa o cancelamento passar como está', async () => {
    // Trocar de tela cancela a requisição em andamento. Isso não é
    // falha e não deve virar mensagem de erro na interface.
    vi.mocked(fetch).mockRejectedValue(new DOMException('Abortado', 'AbortError'));

    await expect(api.get('/clientes')).rejects.toBeInstanceOf(DOMException);
  });
});

describe('respostas sem corpo', () => {
  it('não tenta ler JSON de um 204', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.delete('/clientes/1')).resolves.toBeUndefined();
  });
});

describe('query', () => {
  it('ignora vazio, nulo e indefinido', () => {
    expect(query({ busca: '', status: undefined, pagina: 2 })).toBe('?pagina=2');
  });

  it('devolve string vazia quando não há nada para enviar', () => {
    expect(query({ busca: '' })).toBe('');
  });

  it('codifica caracteres especiais', () => {
    expect(query({ busca: 'ana & cia' })).toContain('ana+%26+cia');
  });
});
