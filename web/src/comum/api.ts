// ======================================
// CLIENTE HTTP
// ======================================
// Um único ponto de contato com a API. Centralizar aqui resolve três
// coisas que no front antigo ficavam espalhadas: montar a URL base,
// anexar o token e reagir a uma sessão expirada.

/** Erro com o status HTTP preservado, para a UI decidir o que mostrar. */
export class ErroApi extends Error {
  // Campos declarados explicitamente em vez de parâmetros do construtor:
  // o template do Vite liga `erasableSyntaxOnly`, que só aceita sintaxe
  // de tipos removível sem transformação de código.
  status: number;
  detalhes?: unknown;

  constructor(status: number, mensagem: string, detalhes?: unknown) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes;
  }

  /** 401/403 significam "refaça o login" ou "sem permissão". */
  get ehAutenticacao() {
    return this.status === 401 || this.status === 403;
  }
}

// Em desenvolvimento o proxy do Vite encaminha /api para o Express, então
// a origem relativa basta. Em produção a API vive em outro domínio.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

// ─── ESCOPOS DE AUTENTICAÇÃO ────────────────────────────
// O sistema tem dois públicos com credenciais independentes, e o
// servidor assina os tokens com segredos diferentes (JWT_SECRET e
// JWT_LOJA_SECRET). Um token de cliente não abre rota administrativa
// nem o contrário — verificado: devolve 401.
//
// Guardar as duas sessões em chaves separadas mantém essa divisão no
// navegador: dá para estar logado como lojista numa aba e como cliente
// na loja, sem uma sessão derrubar a outra.
export type Escopo = 'painel' | 'loja';

const CHAVE_SESSAO: Record<Escopo, string> = {
  painel: 'gestiq_sessao',
  loja: 'gestiq_sessao_loja'
};

export type Sessao = {
  token: string;
  usuario: {
    id: number;
    nome: string;
    usuario: string;
    perfil: 'Administrador' | 'Operador' | 'Visitante';
    ativo: boolean;
  };
};

export type SessaoLoja = {
  token: string;
  cliente: {
    id: number;
    nome: string;
    email: string | null;
    telefone: string | null;
    endereco: string | null;
  };
};

function ler<T>(escopo: Escopo): T | null {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO[escopo]);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    // localStorage corrompido não deve derrubar a aplicação inteira.
    return null;
  }
}

export const lerSessao = () => ler<Sessao>('painel');
export const lerSessaoLoja = () => ler<SessaoLoja>('loja');

export function gravarSessao(sessao: Sessao) {
  localStorage.setItem(CHAVE_SESSAO.painel, JSON.stringify(sessao));
}

export function gravarSessaoLoja(sessao: SessaoLoja) {
  localStorage.setItem(CHAVE_SESSAO.loja, JSON.stringify(sessao));
}

export function limparSessao(escopo: Escopo = 'painel') {
  localStorage.removeItem(CHAVE_SESSAO[escopo]);
}

// Quem quiser reagir à expiração da sessão se inscreve aqui. Evita que
// este módulo precise conhecer o roteador — ele só avisa que expirou.
type Ouvinte = (escopo: Escopo) => void;
const ouvintesSessaoExpirada = new Set<Ouvinte>();

export function aoExpirarSessao(ouvinte: Ouvinte): () => void {
  ouvintesSessaoExpirada.add(ouvinte);
  // O retorno é o cancelamento da inscrição, usado direto como cleanup
  // de useEffect — por isso devolve void, e não o boolean do Set.delete.
  return () => {
    ouvintesSessaoExpirada.delete(ouvinte);
  };
}

type Opcoes = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  /** Rotas públicas (login, catálogo da loja) não mandam token. */
  semAutenticacao?: boolean;
  /** Qual sessão usar. Padrão: o painel administrativo. */
  escopo?: Escopo;
  sinal?: AbortSignal;
};

export async function requisitar<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { metodo = 'GET', corpo, semAutenticacao, escopo = 'painel', sinal } = opcoes;

  const cabecalhos: Record<string, string> = {};
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';

  if (!semAutenticacao) {
    const token = escopo === 'loja' ? lerSessaoLoja()?.token : lerSessao()?.token;
    if (token) cabecalhos.Authorization = `Bearer ${token}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: sinal
    });
  } catch (erro) {
    // Requisição cancelada (troca de tela, digitação na busca) não é
    // falha de rede e não deve virar mensagem de erro para o usuário.
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro;
    throw new ErroApi(
      0,
      'Não foi possível falar com o servidor. Verifique sua conexão.'
    );
  }

  if (resposta.status === 401) {
    // Derruba só o escopo que falhou: uma sessão de cliente expirada
    // não deve deslogar o lojista.
    limparSessao(escopo);
    ouvintesSessaoExpirada.forEach(ouvinte => ouvinte(escopo));
  }

  // 204 (usado nos DELETE) não tem corpo; ler como JSON estouraria.
  if (resposta.status === 204) return undefined as T;

  const texto = await resposta.text();
  let dados: unknown = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = texto;
    }
  }

  if (!resposta.ok) {
    const mensagem =
      (dados as { erro?: string })?.erro ??
      `Erro ${resposta.status} ao chamar ${caminho}`;
    throw new ErroApi(resposta.status, mensagem, (dados as { detalhes?: unknown })?.detalhes);
  }

  return dados as T;
}

/** Monta "?a=1&b=2" ignorando valores vazios, nulos ou indefinidos. */
export function query(parametros: Record<string, string | number | undefined | null>) {
  const busca = new URLSearchParams();
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      busca.set(chave, String(valor));
    }
  }
  const texto = busca.toString();
  return texto ? `?${texto}` : '';
}

export const api = {
  get:    <T>(caminho: string, opcoes?: Omit<Opcoes, 'metodo' | 'corpo'>) =>
    requisitar<T>(caminho, { ...opcoes, metodo: 'GET' }),
  post:   <T>(caminho: string, corpo?: unknown, opcoes?: Omit<Opcoes, 'metodo' | 'corpo'>) =>
    requisitar<T>(caminho, { ...opcoes, metodo: 'POST', corpo }),
  put:    <T>(caminho: string, corpo?: unknown, opcoes?: Omit<Opcoes, 'metodo' | 'corpo'>) =>
    requisitar<T>(caminho, { ...opcoes, metodo: 'PUT', corpo }),
  patch:  <T>(caminho: string, corpo?: unknown, opcoes?: Omit<Opcoes, 'metodo' | 'corpo'>) =>
    requisitar<T>(caminho, { ...opcoes, metodo: 'PATCH', corpo }),
  delete: <T>(caminho: string, opcoes?: Omit<Opcoes, 'metodo' | 'corpo'>) =>
    requisitar<T>(caminho, { ...opcoes, metodo: 'DELETE' })
};
