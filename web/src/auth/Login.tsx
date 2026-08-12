import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
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

export function Login() {
  const { entrar, autenticado } = useAuth();
  const navegar = useNavigate();
  const local = useLocation() as { state?: { de?: string } };
  const [erro, setErro] = useState<string | null>(null);

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
    <div className="min-h-screen grid place-items-center bg-fundo px-4">
      <div className="w-full max-w-sm rounded-xl border border-borda bg-cartao p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-xl bg-marca text-2xl text-white">
            ⚙
          </div>
          <h1 className="text-xl font-bold">GestãoPro</h1>
          <p className="text-sm text-texto-suave">Sistema de Gestão de Serviços</p>
        </div>

        {erro && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro"
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit(aoEnviar)} noValidate className="space-y-4">
          <div>
            <label htmlFor="usuario" className="mb-1 block text-xs text-texto-suave">
              Usuário
            </label>
            <input
              id="usuario"
              autoComplete="username"
              autoFocus
              {...register('usuario')}
              aria-invalid={!!errors.usuario}
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
            />
            {errors.usuario && (
              <p className="mt-1 text-xs text-erro">{errors.usuario.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-xs text-texto-suave">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              {...register('senha')}
              aria-invalid={!!errors.senha}
              className="w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca"
            />
            {errors.senha && <p className="mt-1 text-xs text-erro">{errors.senha.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-texto-fraco">
          Demonstração: <strong className="text-texto-suave">admin</strong> /{' '}
          <strong className="text-texto-suave">admin123</strong>
        </p>
      </div>
    </div>
  );
}
