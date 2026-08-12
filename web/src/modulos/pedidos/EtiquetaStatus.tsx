import { ROTULO_STATUS, type StatusPedido } from './api';

const CORES: Record<StatusPedido, string> = {
  pendente: 'bg-aviso/15 text-aviso',
  processando: 'bg-marca/15 text-marca',
  enviado: 'bg-marca/15 text-marca',
  entregue: 'bg-ok/15 text-ok',
  cancelado: 'bg-erro/15 text-erro'
};

export function EtiquetaStatus({ status }: { status: StatusPedido }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${CORES[status]}`}>
      {ROTULO_STATUS[status]}
    </span>
  );
}
