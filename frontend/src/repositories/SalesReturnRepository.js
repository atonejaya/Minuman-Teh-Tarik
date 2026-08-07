import { normalizeApiResponse } from '../utils/apiUtils';

class SalesReturnRepositoryClass {
  async fetchAll(params) {
    const response = await fetch('/api/v1/sales/returns?' + new URLSearchParams(params));
    return normalizeApiResponse(await response.json());
  }

  async fetchById(id) {
    const response = await fetch(`/api/v1/sales/returns/${id}`);
    return normalizeApiResponse(await response.json());
  }

  async create(data) {
    const response = await fetch('/api/v1/sales/returns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return normalizeApiResponse(await response.json());
  }

  async update(id, data) {
    const response = await fetch(`/api/v1/sales/returns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return normalizeApiResponse(await response.json());
  }

  async delete(id) {
    const response = await fetch(`/api/v1/sales/returns/${id}`, {
      method: 'DELETE'
    });
    return normalizeApiResponse(await response.json());
  }
}

export const SalesReturnRepository = new SalesReturnRepositoryClass();
