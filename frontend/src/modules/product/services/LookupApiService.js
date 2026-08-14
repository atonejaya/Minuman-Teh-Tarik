import { supabase } from '../../../utils/supabase';

const LookupApiService = {
  async getLookups() {
    try {
      const queries = await Promise.all([
        supabase.from('Warehouse').select('id, code, name, is_active').eq('is_active', true).order('name'),
        supabase.from('User').select('id, username, name, role, is_active').eq('role', 'SALES').eq('is_active', true).order('name'),
        supabase.from('Unit').select('id, code, name, symbol').eq('status', 'ACTIVE').order('name'),
        supabase.from('Product').select('id, code, name, sku, category_id, brand_id, unit_id, cost_price, is_active').eq('is_active', true).order('name'),
        supabase.from('ProductCategory').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('PriceLevel').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Area').select('id, code, name').eq('is_active', true).order('name'),
        supabase.from('Route').select('id, code, name').eq('is_active', true).order('name'),
        supabase.from('Supplier').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Brand').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Tax').select('id, code, name, rate').eq('status', 'ACTIVE').order('name'),
        supabase.from('Packaging').select('id, code, name').eq('status', 'ACTIVE').order('name'),
      ]);

      const [warehouses, salesmen, units, products, categories, priceLevels, areas, routes, suppliers, brands, taxes, packagings] = queries;

      for (const q of queries) {
        if (q.error) throw q.error;
      }

      return {
        data: {
          warehouses: warehouses.data || [],
          salesmen: salesmen.data || [],
          units: units.data || [],
          products: products.data || [],
          categories: categories.data || [],
          priceLevels: priceLevels.data || [],
          areas: areas.data || [],
          routes: routes.data || [],
          suppliers: suppliers.data || [],
          brands: brands.data || [],
          taxes: taxes.data || [],
          packagings: packagings.data || [],
        },
        errors: null,
      };
    } catch (err) {
      return { data: null, errors: [{ message: err.message || 'Gagal memuat data referensi' }] };
    }
  },
};

export default LookupApiService;
