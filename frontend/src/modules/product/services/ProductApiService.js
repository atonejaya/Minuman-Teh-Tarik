import { supabase } from '../../../utils/supabase';

const PRODUCT_SELECT = '*, category:ProductCategory(id, name), brand:Brand(id, name), unit:Unit(id, name), supplier:Supplier(id, name), packaging:Packaging(id, name), tax:Tax(id, name, rate), warehouse:Warehouse(id, name)';

const ProductApiService = {
  async getProducts({ search = '', categoryId = '', brandId = '', status = 'all', page = 1, pageSize = 20 } = {}) {
    let query = supabase
      .from('Product')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .order('name');

    if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,code.ilike.%${search}%`);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (brandId) query = query.eq('brand_id', brandId);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    return { success: true, data: data || [], meta: { total: count || 0, page, pageSize } };
  },

  async getById(id) {
    const { data, error } = await supabase.from('Product').select(PRODUCT_SELECT).eq('id', id).single();
    if (error) throw error;
    return { success: true, data };
  },

  async create(payload) {
    const { data, error } = await supabase.from('Product').insert(payload).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  async update(id, payload) {
    const { data, error } = await supabase.from('Product').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data };
  },

  async setActive(id, isActive) {
    const { data, error } = await supabase.from('Product').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) throw error;
    return { success: true, data };
  },
};

export default ProductApiService;
