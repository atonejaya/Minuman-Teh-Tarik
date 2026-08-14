import { supabase } from '../utils/supabase';

class SalesReturnRepositoryClass {
  async fetchAll(params) {
    let query = supabase
      .from('SalesReturn')
      .select('*, warung:Warung(name, code), salesman:User(name)', { count: 'exact' });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.search) query = query.ilike('code', `%${params.search}%`);
    query = query.order('return_date', { ascending: false });

    if (params?.page) {
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const pageSize = params?.pageSize || 20;
    return { success: true, data, meta: { total: count, totalPages: count ? Math.ceil(count / pageSize) : 1 } };
  }

  async fetchById(id) {
    const { data, error } = await supabase
      .from('SalesReturn')
      .select('*, items:SalesReturnItem(*, product:Product(*)), warung:Warung(*), salesman:User(name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data };
  }

  async create(payload) {
    const { data, error } = await supabase.rpc('sales_return_submit', { p_payload: payload });
    if (error) throw error;
    if (!data?.success) throw new Error('Gagal membuat return');
    const { data: full } = await supabase
      .from('SalesReturn')
      .select('*')
      .eq('id', data.id)
      .single();
    return { success: true, data: full || data };
  }

  async approve(id) {
    const { data, error } = await supabase.rpc('sales_return_approve', { p_return_id: id });
    if (error) throw error;
    return { success: true, data };
  }

  async receive(id) {
    const { data, error } = await supabase.rpc('sales_return_receive', { p_return_id: id });
    if (error) throw error;
    return { success: true, data };
  }

  async update(id, payload) {
    const { data, error } = await supabase.from('SalesReturn').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data };
  }

  async delete(id) {
    const { error } = await supabase.from('SalesReturn').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }
}

export const SalesReturnRepository = new SalesReturnRepositoryClass();
