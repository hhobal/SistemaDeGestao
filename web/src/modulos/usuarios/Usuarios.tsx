import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabela, type Coluna } from '@/comum/componentes/Tabela';
import { Botao } from '@/comum/componentes/Botao';
import { Modal } from '@/comum/componentes/Modal';
import { CampoTexto, CampoSelecao } from '@/comum/componentes/Campo';
import { useAuth } from '@/auth/AuthContext';
import { ErroApi } from '@/comum/api';
import { formatarData } from '@/comum/tipos';
import {
  atualizarUsuario,
  chavesUsuario,
  contarAdministradoresAtivos,
  criarUsuario,
  DESCRICAO_PERFIL,
  esquemaCriarUsuario,
  esquemaEditarUsuario,
  excluirUsuario,
  listarUsuarios,
  motivoNaoPodeEditar,
  motivoNaoPodeExcluir,
  PERFIS,
  type DadosUsuario,
  type FormularioUsuario,
  type Perfil,
  type Usuario
} from './api';

const CORES_PERFIL: Record<Perfil, string> = {
  Administrador: 'bg-marca/15 text-marca',
  Operador: 'bg-ok/15 text-ok',
  Visitante: 'bg-texto-fraco/20 text-texto-suave'
};

export function Usuarios() {
  const { sessao, temPerfil } = useAuth();
  const fila = useQueryClient();

  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState<Usuario | null>(null);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const usuarios = useQuery({
    queryKey: chavesUsuario.todos,
    queryFn: ({ signal }) => listarUsuarios(signal),
    // Operador e Visitante recebem 403; insistir só atrasaria a
    // mensagem.
    retry: false
  });

  const lista = usuarios.data ?? [];
  const admins = contarAdministradoresAtivos(lista);

  function aoTerminar() {
    fila.invalidateQueries({ queryKey: chavesUsuario.todos });
  }

  const salvar = useMutation({
    mutationFn: (dados: DadosUsuario) =>
      emEdicao ? atualizarUsuario(emEdicao.id, dados) : criarUsuario(dados),
    onSuccess: () => {
      aoTerminar();
      setFormularioAberto(false);
      setEmEdicao(null);
    },
    onError: e => setErroFormulario(e instanceof ErroApi ? e.message : 'Não foi possível salvar.')
  });

  const remover = useMutation({
    mutationFn: (u: Usuario) => excluirUsuario(u.id),
    onSuccess: () => {
      aoTerminar();
      setParaExcluir(null);
    },
    onError: e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível excluir.')
  });

  if (usuarios.error instanceof ErroApi && usuarios.error.status === 403) {
    return (
      <div className="rounded-xl border border-borda bg-cartao p-8 text-center">
        <h1 className="text-lg font-semibold">Usuários</h1>
        <p className="mt-2 text-sm text-texto-suave">
          Somente o perfil Administrador gerencia acessos. Seu perfil é{' '}
          <strong className="text-texto">{sessao?.usuario.perfil}</strong>.
        </p>
      </div>
    );
  }

  const colunas: Coluna<Usuario>[] = [
    {
      cabecalho: 'Usuário',
      celula: u => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{u.nome}</span>
            {u.id === sessao?.usuario.id && (
              <span className="shrink-0 rounded bg-marca/15 px-1.5 py-0.5 text-[10px] text-marca">
                você
              </span>
            )}
          </div>
          <div className="font-mono text-xs text-texto-fraco">{u.usuario}</div>
        </div>
      )
    },
    {
      cabecalho: 'Perfil',
      celula: u => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${CORES_PERFIL[u.perfil]}`}>
          {u.perfil}
        </span>
      )
    },
    {
      cabecalho: 'Situação',
      celula: u => (
        <span className={`text-xs ${u.ativo ? 'text-ok' : 'text-texto-fraco'}`}>
          {u.ativo ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      cabecalho: 'Desde',
      ocultarNoCelular: true,
      celula: u => <span className="text-xs">{formatarData(u.criadoEm)}</span>
    },
    {
      cabecalho: '',
      alinhamento: 'direita',
      celula: u => {
        const bloqueio = motivoNaoPodeExcluir(u, lista, sessao?.usuario.id);
        return (
          <div className="flex justify-end gap-1">
            <button
              onClick={() => {
                setEmEdicao(u);
                setErroFormulario(null);
                setFormularioAberto(true);
              }}
              aria-label={`Editar ${u.nome}`}
              className="rounded px-2 py-1 text-xs text-texto-suave transition hover:bg-realce hover:text-texto"
            >
              Editar
            </button>
            <button
              onClick={() => {
                setErro(null);
                setParaExcluir(u);
              }}
              disabled={bloqueio !== null}
              title={bloqueio ?? undefined}
              aria-label={`Excluir ${u.nome}`}
              className="rounded px-2 py-1 text-xs text-erro transition hover:bg-erro/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Excluir
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Usuários</h1>
          <p className="text-sm text-texto-suave">
            O perfil define o que cada pessoa pode fazer — e a API aplica a mesma regra.
          </p>
        </div>
        {temPerfil('Administrador') && (
          <Botao
            onClick={() => {
              setEmEdicao(null);
              setErroFormulario(null);
              setFormularioAberto(true);
            }}
          >
            Novo usuário
          </Botao>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {PERFIS.map(p => (
          <div key={p} className="rounded-lg border border-borda bg-cartao p-3">
            <div className={`inline-block rounded-full px-2 py-0.5 text-xs ${CORES_PERFIL[p]}`}>
              {p}
            </div>
            <p className="mt-2 text-xs text-texto-fraco">{DESCRICAO_PERFIL[p]}</p>
          </div>
        ))}
      </div>

      {admins === 1 && (
        <p className="rounded-lg border border-aviso/30 bg-aviso/5 px-3 py-2 text-xs text-aviso">
          Existe apenas um Administrador ativo. Ele não pode ser removido, desativado nem
          rebaixado — sem ele ninguém conseguiria gerenciar acessos.
        </p>
      )}

      {erro && (
        <div role="alert" className="rounded-lg border border-erro/40 bg-erro/10 p-3 text-sm text-erro">
          {erro}
        </div>
      )}

      <div className="rounded-xl border border-borda bg-cartao">
        <Tabela
          colunas={colunas}
          itens={lista}
          chave={u => u.id}
          carregando={usuarios.isPending}
          vazio="Nenhum usuário cadastrado."
        />
      </div>

      <FormularioUsuarioModal
        aberto={formularioAberto}
        usuario={emEdicao}
        todos={lista}
        salvando={salvar.isPending}
        erro={erroFormulario}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={dados => salvar.mutate(dados)}
      />

      <Modal
        aberto={paraExcluir !== null}
        titulo="Excluir usuário"
        aoFechar={() => setParaExcluir(null)}
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setParaExcluir(null)} disabled={remover.isPending}>
              Cancelar
            </Botao>
            <Botao
              variante="perigo"
              onClick={() => paraExcluir && remover.mutate(paraExcluir)}
              disabled={remover.isPending}
            >
              {remover.isPending ? 'Excluindo…' : 'Excluir'}
            </Botao>
          </>
        }
      >
        <p className="text-sm text-texto-suave">
          Excluir <strong className="text-texto">{paraExcluir?.nome}</strong>? As ordens de serviço
          atribuídas a ele ficam sem responsável.
        </p>
      </Modal>
    </div>
  );
}

function FormularioUsuarioModal({
  aberto,
  usuario,
  todos,
  salvando,
  erro,
  aoFechar,
  aoSalvar
}: {
  aberto: boolean;
  usuario: Usuario | null;
  todos: Usuario[];
  salvando: boolean;
  erro: string | null;
  aoFechar: () => void;
  aoSalvar: (dados: DadosUsuario) => void;
}) {
  const editando = usuario !== null;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<FormularioUsuario, unknown, DadosUsuario>({
    // Na criação a senha é obrigatória; na edição, em branco mantém a
    // atual.
    resolver: zodResolver(editando ? esquemaEditarUsuario : esquemaCriarUsuario),
    defaultValues: { nome: '', usuario: '', perfil: 'Operador', ativo: true, senha: '' }
  });

  useEffect(() => {
    if (!aberto) return;
    reset(
      usuario
        ? {
            nome: usuario.nome,
            usuario: usuario.usuario,
            perfil: usuario.perfil,
            ativo: usuario.ativo,
            senha: ''
          }
        : { nome: '', usuario: '', perfil: 'Operador', ativo: true, senha: '' }
    );
  }, [aberto, usuario, reset]);

  // Avisa antes de enviar que a alteração derrubaria o último
  // Administrador. O servidor recusaria com 409.
  const bloqueio = usuario
    ? motivoNaoPodeEditar(
        usuario,
        { perfil: watch('perfil'), ativo: watch('ativo') },
        todos
      )
    : null;

  return (
    <Modal
      aberto={aberto}
      titulo={editando ? 'Editar usuário' : 'Novo usuário'}
      aoFechar={aoFechar}
      rodape={
        <>
          <Botao variante="secundario" type="button" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao type="submit" form="form-usuario" disabled={salvando || bloqueio !== null}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      {erro && (
        <div role="alert" className="mb-4 rounded-lg border border-erro/40 bg-erro/10 px-3 py-2 text-sm text-erro">
          {erro}
        </div>
      )}

      <form id="form-usuario" onSubmit={handleSubmit(aoSalvar)} noValidate className="space-y-3">
        <CampoTexto id="nome" rotulo="Nome" autoFocus erro={errors.nome?.message} {...register('nome')} />

        <CampoTexto
          id="usuario"
          rotulo="Usuário (login)"
          autoComplete="off"
          erro={errors.usuario?.message}
          {...register('usuario')}
        />

        <CampoTexto
          id="senha"
          rotulo={editando ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
          type="password"
          autoComplete="new-password"
          erro={errors.senha?.message}
          {...register('senha')}
        />

        <CampoSelecao
          id="perfil"
          rotulo="Perfil"
          opcoes={PERFIS.map(p => ({ valor: p, rotulo: p }))}
          {...register('perfil')}
        />
        <p className="-mt-1 text-xs text-texto-fraco">{DESCRICAO_PERFIL[watch('perfil')]}</p>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-marca" {...register('ativo')} />
          Usuário ativo (pode entrar no sistema)
        </label>

        {bloqueio && (
          <div className="rounded-lg border border-aviso/40 bg-aviso/10 px-3 py-2 text-xs text-aviso">
            {bloqueio}
          </div>
        )}
      </form>
    </Modal>
  );
}
