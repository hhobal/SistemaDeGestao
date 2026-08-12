import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErroApi } from '../../lib/api';
import { formatarData, formatarMoeda } from '../../lib/tipos';
import {
  cadastrarNaLoja,
  chavesLoja,
  clienteLogado,
  entrarNaLoja,
  esquemaCadastroLoja,
  esquemaLoginLoja,
  meusPedidos,
  sairDaLoja,
  type DadosCadastro,
  type DadosLogin
} from '../../loja/api';

const CAMPO =
  'w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-sm outline-none focus:border-marca';

export function Conta() {
  // A sessão fica em localStorage e não em estado do React; este
  // contador força a releitura depois de entrar ou sair.
  const [versao, setVersao] = useState(0);
  const sessao = clienteLogado();

  if (!sessao) return <Acesso aoEntrar={() => setVersao(v => v + 1)} />;
  return <Painel key={versao} aoSair={() => setVersao(v => v + 1)} />;
}

function Acesso({ aoEntrar }: { aoEntrar: () => void }) {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex rounded-lg border border-borda p-1">
        {(['entrar', 'cadastrar'] as const).map(opcao => (
          <button
            key={opcao}
            onClick={() => setModo(opcao)}
            className={`flex-1 rounded px-3 py-1.5 text-sm transition ${
              modo === opcao ? 'bg-marca text-white' : 'text-texto-suave hover:bg-realce'
            }`}
          >
            {opcao === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      {modo === 'entrar' ? (
        <FormEntrar aoEntrar={aoEntrar} />
      ) : (
        <FormCadastrar aoEntrar={aoEntrar} />
      )}
    </div>
  );
}

function FormEntrar({ aoEntrar }: { aoEntrar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<DadosLogin>({ resolver: zodResolver(esquemaLoginLoja) });

  return (
    <form
      onSubmit={handleSubmit(async dados => {
        setErro(null);
        try {
          await entrarNaLoja(dados);
          aoEntrar();
        } catch (e) {
          setErro(e instanceof ErroApi ? e.message : 'Não foi possível entrar.');
        }
      })}
      noValidate
      className="space-y-3 rounded-xl border border-borda bg-cartao p-5"
    >
      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro">
          {erro}
        </div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-xs text-texto-suave">
          E-mail
        </label>
        <input id="email" type="email" autoComplete="email" className={CAMPO} {...register('email')} />
        {errors.email && <p className="mt-1 text-xs text-erro">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="senha" className="mb-1 block text-xs text-texto-suave">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          className={CAMPO}
          {...register('senha')}
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

      <p className="text-center text-[11px] text-texto-fraco">
        Demonstração: qualquer e-mail da lista de clientes com a senha{' '}
        <strong className="text-texto-suave">cliente123</strong>
      </p>
    </form>
  );
}

function FormCadastrar({ aoEntrar }: { aoEntrar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<DadosCadastro>({
    resolver: zodResolver(esquemaCadastroLoja),
    defaultValues: { nome: '', email: '', telefone: '', endereco: '', senha: '' }
  });

  return (
    <form
      onSubmit={handleSubmit(async dados => {
        setErro(null);
        try {
          await cadastrarNaLoja(dados);
          aoEntrar();
        } catch (e) {
          // 409 quando o e-mail já tem conta; a mensagem da API orienta
          // a fazer login.
          setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a conta.');
        }
      })}
      noValidate
      className="space-y-3 rounded-xl border border-borda bg-cartao p-5"
    >
      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro">
          {erro}
        </div>
      )}

      {(
        [
          { id: 'nome', rotulo: 'Nome completo', tipo: 'text' },
          { id: 'email', rotulo: 'E-mail', tipo: 'email' },
          { id: 'telefone', rotulo: 'Telefone', tipo: 'tel' },
          { id: 'endereco', rotulo: 'Endereço', tipo: 'text' },
          { id: 'senha', rotulo: 'Senha (mínimo 6 caracteres)', tipo: 'password' }
        ] as const
      ).map(campo => (
        <div key={campo.id}>
          <label htmlFor={campo.id} className="mb-1 block text-xs text-texto-suave">
            {campo.rotulo}
          </label>
          <input id={campo.id} type={campo.tipo} className={CAMPO} {...register(campo.id)} />
          {errors[campo.id] && (
            <p className="mt-1 text-xs text-erro">{errors[campo.id]?.message}</p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-marca py-2.5 text-sm font-semibold text-white transition hover:bg-marca-escura disabled:opacity-60"
      >
        {isSubmitting ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  );
}

const CORES_STATUS: Record<string, string> = {
  pendente: 'bg-aviso/15 text-aviso',
  processando: 'bg-marca/15 text-marca',
  enviado: 'bg-marca/15 text-marca',
  entregue: 'bg-ok/15 text-ok',
  cancelado: 'bg-erro/15 text-erro'
};

function Painel({ aoSair }: { aoSair: () => void }) {
  const sessao = clienteLogado()!;
  const fila = useQueryClient();

  const pedidos = useQuery({
    queryKey: chavesLoja.meusPedidos,
    queryFn: meusPedidos
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Olá, {sessao.cliente.nome.split(' ')[0]}</h1>
          <p className="text-sm text-texto-suave">{sessao.cliente.email}</p>
        </div>
        <button
          onClick={() => {
            sairDaLoja();
            // Sem limpar o cache, os pedidos de quem saiu ficariam
            // visíveis para o próximo login nesta mesma aba.
            fila.removeQueries({ queryKey: chavesLoja.meusPedidos });
            aoSair();
          }}
          className="rounded-lg border border-borda px-3 py-1.5 text-sm text-texto-suave transition hover:bg-realce hover:text-texto"
        >
          Sair
        </button>
      </div>

      <h2 className="text-sm font-semibold text-texto-suave">Meus pedidos</h2>

      {pedidos.isPending && <div className="h-32 animate-pulse rounded-xl bg-cartao" />}

      {pedidos.error && (
        <div className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {pedidos.error.message}
        </div>
      )}

      {pedidos.data?.length === 0 && (
        <p className="rounded-xl border border-borda bg-cartao p-8 text-center text-sm text-texto-fraco">
          Você ainda não fez nenhum pedido.
        </p>
      )}

      <ul className="space-y-3">
        {pedidos.data?.map(pedido => (
          <li key={pedido.id} className="rounded-xl border border-borda bg-cartao p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-semibold text-marca">#{pedido.numero}</span>
                <span className="ml-2 text-xs text-texto-fraco">{formatarData(pedido.data)}</span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  CORES_STATUS[pedido.status] ?? 'bg-realce text-texto-suave'
                }`}
              >
                {pedido.status}
              </span>
            </div>

            <ul className="mt-3 space-y-1 text-sm">
              {pedido.itens.map(item => (
                <li key={item.id} className="flex justify-between gap-3 text-texto-suave">
                  <span className="truncate">
                    {item.quantidade}× {item.nome}
                  </span>
                  <span className="shrink-0">{formatarMoeda(item.subtotal)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex justify-between border-t border-borda pt-2 text-sm">
              <span className="text-texto-suave">Total</span>
              <span className="font-bold text-ok">{formatarMoeda(pedido.total)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
