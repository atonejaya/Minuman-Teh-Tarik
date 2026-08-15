import { supabase } from '../../../utils/supabase';

const BUCKET = 'company-assets';

const SettingsApiService = {
  async getAll() {
    const { data, error } = await supabase.from('Setting').select('key, value').order('key');
    if (error) throw error;
    return (data || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async saveAll(entries) {
    for (const [key, value] of Object.entries(entries)) {
      const { error } = await supabase
        .from('Setting')
        .upsert(
          { key, value: String(value), type: 'text', updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    }
  },

  async uploadLogo(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `logos/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  },

  async resetData(confirm) {
    const { data, error } = await supabase.rpc('admin_reset_data', { p_confirm: confirm });
    if (error) throw error;

    await this.removeAllVisitPhotos();
    return data;
  },

  async removeAllVisitPhotos() {
    const paths = [];
    const bucket = supabase.storage.from('visit-photos');
    const walk = async (prefix) => {
      const { data: items, error } = await bucket.list(prefix, { limit: 1000, offset: 0 });
      if (error) throw error;
      for (const item of items || []) {
        if (item.metadata) {
          paths.push(prefix ? `${prefix}/${item.name}` : item.name);
        } else {
          await walk(prefix ? `${prefix}/${item.name}` : item.name);
        }
      }
    };
    await walk('');
    if (paths.length === 0) return;
    const { error } = await bucket.remove(paths);
    if (error) throw error;
  },
};

export default SettingsApiService;
