import { supabase } from '../utils/supabase';

class SalesTransactionRepositoryClass {
  async fetchAll(params) {
    let query = supabase
      .from('SalesTransaction')
      .select('*, warung:Warung(name, code), salesman:User(name)', { count: 'exact' });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.payment_status) query = query.eq('payment_status', params.payment_status);
    if (params?.search) query = query.ilike('code', `%${params.search}%`);
    query = query.order('created_at', { ascending: false });

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
      .from('SalesTransaction')
      .select('*, items:SalesTransactionItem(*, product:Product(*)), warung:Warung(*), salesman:User(name), payments:Payment(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data };
  }

  async create(payload) {
    const { data, error } = await supabase.rpc('create_sales_transaction', { p_payload: payload });
    if (error) throw error;
    return { success: true, data };
  }

  async update(id, payload) {
    const { data, error } = await supabase.from('SalesTransaction').update(payload).eq('id', id).select();
    if (error) throw error;
    return { success: true, data };
  }

  async delete(id) {
    const { error } = await supabase.from('SalesTransaction').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }
}

export const SalesTransactionRepository = new SalesTransactionRepositoryClass();
