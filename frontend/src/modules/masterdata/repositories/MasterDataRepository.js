import { supabase } from '../../../utils/supabase';

const MasterDataRepository = {
  async list(table, { page = 1, pageSize = 20, order = 'name', select = '*' } = {}) {
    const from = (page - 1) * pageSize;
    let query = supabase
      .from(table)
      .select(select, { count: 'exact' })
      .order(order)
      .range(from, from + pageSize - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: data || [],
      total: count || 0,
      totalPages: count ? Math.ceil(count / pageSize) : 1,
    };
  },

  async getById(table, id) {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(table, payload) {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async update(table, id, payload) {
    const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

export default MasterDataRepository;
