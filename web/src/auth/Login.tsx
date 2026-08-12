import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import { ErroApi } from '@/comum/api';

// O mesmo formato que o back-end valida em auth.controller.js. Validar
// nos dois lados evita ida ao servidor para erro óbvio, sem abrir mão
// da checagem que realmente protege — a do servidor.
const esquema = z.object({
  usuario: z.string().trim().min(1, 'Informe o usuário.'),
  senha: z.string().min(1, 'Informe a senha.')
});

type Campos = z.infer<typeof esquema>;

const DESTAQUES = [
  ['Pedidos e estoque', 'Baixa de estoque e lançamento financeiro na mesma transação.'],
  ['Ordens de serviço', 'Abertura, andamento e conclusão com receita automática.'],
  ['Financeiro e relatórios', 'Fluxo de caixa, faturamento mensal e ranking de clientes.']
];

const CAMPO =
  'w-full rounded-lg border border-borda-clara bg-fundo px-3.5 py-2.5 text-sm outline-none transition ' +
  'placeholder:text-texto-fraco focus:border-marca focus:ring-2 focus:ring-marca/25 ' +
  'aria-[invalid=true]:border-erro';

export function Login() {
  const { entrar, autenticado } = useAuth();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };
  const [erro, setErro] = useState<string | null>(null);
  const [verSenha, setVerSenha] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { usuario: '', senha: '' }
  });

  // Quem já está logado não deve ver a tela de login.
  if (autenticado) return <Navigate to="/" replace />;

  async function aoEnviar(campos: Campos) {
    setErro(null);
    try {
      await entrar(campos.usuario, campos.senha);
      navegar(local.state?.de ?? '/', { replace: true });
    } catch (e) {
      // 429 vem do limitador de tentativas; a mensagem da API já
      // explica quanto tempo esperar.
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível entrar.');
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* ─── PAINEL DE MARCA ───────────────────
          Só a partir de lg: em telas estreitas ele viraria uma parede
          de texto entre a pessoa e o formulário. No lugar dele o
          cabeçalho compacto abaixo, dentro da coluna do formulário. */}
      <aside className="relative hidden overflow-hidden bg-superficie p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Dois halos difusos dão profundidade sem imagem para carregar. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-marca/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-info/10 blur-3xl"
        />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-marca text-lg text-sobre-marca">
              ⚙
            </span>
            <span className="text-lg font-bold tracking-tight">GestãoPro</span>
          </div>

          <h2 className="mt-12 max-w-md text-3xl font-bold leading-tight">
            ERP com loja virtual integrada
          </h2>
          <p className="mt-3 max-w-md text-texto-suave">
            Um pedido feito na loja aparece no painel, baixa o estoque e gera o
            lançamento financeiro — de uma vez só.
          </p>

          <ul className="mt-10 max-w-md space-y-5">
            {DESTAQUES.map(([titulo, descricao]) => (
              <li key={titulo} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marca"
                />
                <div>
                  <p className="font-medium">{titulo}</p>
                  <p className="text-sm text-texto-suave">{descricao}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-texto-fraco">
          React · TypeScript · Node · PostgreSQL
        </p>
      </aside>

      {/* ─── FORMULÁRIO ─────────────────────── */}
      <main className="flex min-h-dvh items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Marca compacta, só onde o painel lateral não aparece. */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-marca text-lg text-sobre-marca">
              ⚙
            </span>
            <div>
              <p className="font-bold leading-tight">GestãoPro</p>
              <p className="text-xs text-texto-suave">ERP com loja virtual</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-texto-suave">
            Acesse o painel administrativo.
          </p>

          {erro && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro"
            >
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit(aoEnviar)} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="usuario" className="mb-1.5 block text-xs font-medium text-texto-suave">
                Usuário
              </label>
              <input
                id="usuario"
                autoComplete="username"
                autoFocus
                placeholder="admin"
                {...register('usuario')}
                aria-invalid={!!errors.usuario}
                aria-describedby={errors.usuario ? 'usuario-erro' : undefined}
                className={CAMPO}
              />
              {errors.usuario && (
                <p id="usuario-erro" className="mt-1.5 text-xs text-erro">
                  {errors.usuario.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="senha" className="mb-1.5 block text-xs font-medium text-texto-suave">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={verSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('senha')}
                  aria-invalid={!!errors.senha}
                  aria-describedby={errors.senha ? 'senha-erro' : undefined}
                  className={`${CAMPO} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(v => !v)}
                  // O rótulo diz a ação, não o estado: um leitor de tela
                  // anuncia "mostrar senha" enquanto ela está oculta.
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-texto-suave transition hover:text-texto"
                >
                  {verSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {errors.senha && (
                <p id="senha-erro" className="mt-1.5 text-xs text-erro">
                  {errors.senha.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-sobre-marca transition hover:bg-marca-escura focus:outline-none focus:ring-2 focus:ring-marca/40 disabled:opacity-60"
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-borda bg-cartao px-4 py-3">
            <p className="text-xs text-texto-suave">
              Demonstração:{' '}
              <strong className="font-semibold text-texto">admin</strong> /{' '}
              <strong className="font-semibold text-texto">admin123</strong>
            </p>
          </div>

          {/* A loja é pública e fica fora do login. Sem este link ela é
              praticamente invisível para quem chega pela primeira vez. */}
          <Link
            to="/loja"
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-texto-suave transition hover:text-marca"
          >
            Ver a loja virtual
            <span aria-hidden>→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
