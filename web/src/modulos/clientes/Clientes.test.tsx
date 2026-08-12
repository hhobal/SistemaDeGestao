// ======================================
// TELA DE CLIENTES
// ======================================
// Exercita a tela inteira contra um servidor simulado: lista, busca,
// filtra, cria e respeita permissão. É o teste que vai proteger os
// outros oito CRUDs, porque todos seguirão este mesmo formato.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProvedorAuth } from '@/auth/AuthContext';
import { Clientes } from './Clientes';
import { gravarSessao, type Sessao } from '@/comum/api';
import type { Cliente } from './api';

const CLIENTES: Cliente[] = [
  {
    id: 1, nome: 'Ana Beatriz Ramalho', email: 'ana@email.com', telefone: '(11) 90000-0001',
    cpf: '111.111.111-11', endereco: 'Rua A, 1', observacao: null, status: 'ativo',
    origem: 'loja', criadoEm: '2026-01-10T12:00:00.000Z'
  },
  {
    id: 2, nome: 'Carlos Eduardo Menezes', email: 'carlos@email.com', telefone: '(11) 90000-0002',
    cpf: null, endereco: null, observacao: null, status: 'inadimplente',
    origem: 'manual', criadoEm: '2026-02-20T12:00:00.000Z'
  }
];

function sessaoCom(perfil: Sessao['usuario']['perfil']): Sessao {
  return { token: 't', usuario: { id: 1, nome: 'Ana', usuario: 'ana', perfil, ativo: true } };
}

/** Registra as chamadas para as asserções e devolve a resposta simulada. */
function servidorSimulado() {
  const chamadas: string[] = [];

  const buscar = vi.fn(async (url: string | URL | Request, opcoes?: RequestInit) => {
    const endereco = String(url);
    chamadas.push(`${opcoes?.method ?? 'GET'} ${endereco}`);

    if (opcoes?.method === 'POST') {
      return new Response(JSON.stringify({ ...CLIENTES[0], id: 99 }), { status: 201 });
    }

    const parametros = new URL(endereco, 'http://local').searchParams;
    const busca = (parametros.get('busca') ?? '').toLowerCase();
    const status = parametros.get('status') ?? '';

    const filtrados = CLIENTES.filter(
      c =>
        (!busca || c.nome.toLowerCase().includes(busca)) &&
        (!status || c.status === status)
    );

    return new Response(
      JSON.stringify({
        itens: filtrados,
        paginacao: { total: filtrados.length, pagina: 1, porPagina: 20, totalPaginas: 1 }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });

  vi.stubGlobal('fetch', buscar);
  return { chamadas };
}

function montar() {
  // retry desligado: um erro proposital no teste não deve custar
  // segundos de tentativas.
  const fila = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={fila}>
      <MemoryRouter>
        <ProvedorAuth>
          <Clientes />
        </ProvedorAuth>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  gravarSessao(sessaoCom('Administrador'));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listagem', () => {
  it('mostra os clientes devolvidos pela API', async () => {
    servidorSimulado();
    montar();

    expect(await screen.findByText('Ana Beatriz Ramalho')).toBeInTheDocument();
    expect(screen.getByText('Carlos Eduardo Menezes')).toBeInTheDocument();
  });

  it('exibe a origem e o status de cada cliente', async () => {
    servidorSimulado();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    expect(screen.getByText('Loja virtual')).toBeInTheDocument();
    expect(screen.getByText('inadimplente')).toBeInTheDocument();
  });

  it('avisa quando o filtro não devolve nada', async () => {
    servidorSimulado();
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    await usuario.type(screen.getByLabelText('Buscar clientes'), 'inexistente');

    expect(
      await screen.findByText(/nenhum cliente encontrado com esses filtros/i)
    ).toBeInTheDocument();
  });
});

describe('busca', () => {
  it('espera a pausa na digitação antes de chamar a API', async () => {
    const { chamadas } = servidorSimulado();
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    const antes = chamadas.length;

    await usuario.type(screen.getByLabelText('Buscar clientes'), 'Ana');

    // Sem o debounce, três letras virariam três requisições.
    await waitFor(() => {
      const novas = chamadas.slice(antes);
      expect(novas.length).toBeLessThanOrEqual(1);
      expect(novas.some(c => c.includes('busca=Ana'))).toBe(true);
    });
  });

  it('manda o status escolhido para a API', async () => {
    const { chamadas } = servidorSimulado();
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    await usuario.selectOptions(screen.getByLabelText('Filtrar por status'), 'inadimplente');

    await waitFor(() => {
      expect(chamadas.some(c => c.includes('status=inadimplente'))).toBe(true);
    });
  });
});

describe('permissões', () => {
  it('esconde as ações de escrita do perfil Visitante', async () => {
    gravarSessao(sessaoCom('Visitante'));
    servidorSimulado();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');

    // A API também recusa a escrita (bloquearVisitanteEmEscrita); aqui
    // garantimos que a interface nem oferece o caminho.
    expect(screen.queryByRole('button', { name: /novo cliente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /editar ana/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir ana/i })).not.toBeInTheDocument();
  });

  it('oferece as ações para quem pode escrever', async () => {
    servidorSimulado();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    expect(screen.getByRole('button', { name: /novo cliente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /editar ana/i })).toBeInTheDocument();
  });
});

describe('cadastro', () => {
  it('envia os dados preenchidos para a API', async () => {
    const { chamadas } = servidorSimulado();
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    await usuario.click(screen.getByRole('button', { name: /novo cliente/i }));

    const dialogo = await screen.findByRole('dialog');
    await usuario.type(within(dialogo).getByLabelText('Nome'), 'Novo Cliente');
    await usuario.click(within(dialogo).getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(chamadas.some(c => c.startsWith('POST'))).toBe(true);
    });
  });

  it('não envia nada quando o nome está vazio', async () => {
    const { chamadas } = servidorSimulado();
    const usuario = userEvent.setup();
    montar();

    await screen.findByText('Ana Beatriz Ramalho');
    await usuario.click(screen.getByRole('button', { name: /novo cliente/i }));

    const dialogo = await screen.findByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: /^salvar$/i }));

    expect(await within(dialogo).findByText('Informe o nome.')).toBeInTheDocument();
    expect(chamadas.some(c => c.startsWith('POST'))).toBe(false);
  });
});
