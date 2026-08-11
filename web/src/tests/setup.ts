import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // Cada teste começa sem sessão gravada; senão um teste de login
  // passaria por engano por causa do estado deixado pelo anterior.
  localStorage.clear();
});

// O jsdom ainda não implementa os métodos de <dialog>, usados pelo
// componente Modal. Sem estes stubs, qualquer teste que abra um modal
// estoura antes de chegar na asserção.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
}
