import { normalizeApiResponse } from '../utils/apiUtils';

class SalesTransactionRepositoryClass {
  async fetchAll(params) {
    const response = await fetch('/api/sales-transactions?' + new URLSearchParams(params));
    return normalizeApiResponse(await response.json());
  }

  async fetchById(id) {
    const response = await fetch(`/api/sales-transactions/${id}`);
    return normalizeApiResponse(await response.json());
  }

  async create(data) {
    const response = await fetch('/api/sales-transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return normalizeApiResponse(await response.json());
  }

  async update(id, data) {
    const response = await fetch(`/api/sales-transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return normalizeApiResponse(await response.json());
  }

  async delete(id) {
    const response = await fetch(`/api/sales-transactions/${id}`, {
      method: 'DELETE'
    });
    return normalizeApiResponse(await response.json());
  }
}

export const SalesTransactionRepository = new SalesTransactionRepositoryClass();
