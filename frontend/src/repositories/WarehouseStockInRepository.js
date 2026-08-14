import { supabase } from '../utils/supabase';

const WarehouseStockInRepository = {
  async getStockIns(params) {
    let query = supabase
      .from('WarehouseStockIn')
      .select('*, warehouse:Warehouse(name, code)', { count: 'exact' });
      
    if (params?.status) query = query.eq('status', params.status);
    if (params?.warehouse_id) query = query.eq('warehouse_id', params.warehouse_id);
    query = query.order('created_at', { ascending: false });

    if (params?.page) {
      const page = params.page || 1;
      const pageSize = params.pageSize || 20;
      query = query.range((page - 1) * pageSize, page * pageSize - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const pageSize = params?.pageSize || 20;
    return { data, meta: { total: count, totalPages: count ? Math.ceil(count / pageSize) : 1 } };
  },

  async getStockIn(id) {
    const { data, error } = await supabase
      .from('WarehouseStockIn')
      .select('*, items:WarehouseStockInItem(*, product:Product(*)), warehouse:Warehouse(name, code)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data };
  },

  async createStockIn(payload) {
    const items = payload.items && payload.items.length > 0 ? payload.items : [];
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const { data: header, error: headerErr } = await supabase
      .from('WarehouseStockIn')
      .insert([{
        doc_number: `IN-${Date.now()}`,
        doc_date: payload.doc_date || new Date().toISOString().slice(0, 10),
        warehouse_id: payload.warehouse_id || null,
        status: 'DRAFT',
        total_qty: totalQty,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();
    if (headerErr) throw headerErr;

    if (items.length > 0) {
      const rows = items.map((i) => ({
        stock_in_id: header.id,
        product_id: i.product_id,
        qty: Number(i.qty) || 0,
        unit_id: i.unit_id || null,
        remark: i.remark || null,
      }));
      const { error: itemsErr } = await supabase.from('WarehouseStockInItem').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    return { data: header };
  },

  async confirmStockIn(id) {
    const { data, error } = await supabase.rpc('warehouse_stock_in_confirm', { p_stock_in_id: id });
    if (error) throw error;
    return { data };
  },

  async updateStockIn(id, payload) {
    const items = payload.items && payload.items.length > 0 ? payload.items : [];
    const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const { data: header, error: headerErr } = await supabase
      .from('WarehouseStockIn')
      .update({
        doc_date: payload.doc_date,
        warehouse_id: payload.warehouse_id || null,
        total_qty: totalQty,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (headerErr) throw headerErr;

    const { error: delErr } = await supabase
      .from('WarehouseStockInItem')
      .delete()
      .eq('stock_in_id', id);
    if (delErr) throw delErr;

    if (items.length > 0) {
      const rows = items.map((i) => ({
        stock_in_id: id,
        product_id: i.product_id,
        qty: Number(i.qty) || 0,
        unit_id: i.unit_id || null,
        remark: i.remark || null,
      }));
      const { error: itemsErr } = await supabase.from('WarehouseStockInItem').insert(rows);
      if (itemsErr) throw itemsErr;
    }

    return { data: header };
  },

  async deleteStockIn(id) {
    // Delete items first to maintain referential integrity (if no CASCADE)
    await supabase.from('WarehouseStockInItem').delete().eq('stock_in_id', id);
    const { error } = await supabase.from('WarehouseStockIn').delete().eq('id', id).eq('status', 'DRAFT');
    if (error) throw error;
    return { success: true };
  },
};

export default WarehouseStockInRepository;
