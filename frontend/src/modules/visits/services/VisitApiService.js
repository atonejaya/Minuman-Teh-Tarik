import { supabase } from '../../../utils/supabase';

const VisitApiService = {
  getPlan(date) {
    return supabase.rpc('get_sales_visit_plan', { p_date: date });
  },

  getWarungBaselines(warungId) {
    return supabase.rpc('get_warung_baselines', { p_warung_id: warungId });
  },

  checkIn({ warungId, latitude, longitude, openingNote, photoPath, photoMime }) {
    return supabase.rpc('visit_check_in', {
      p_warung_id: warungId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_opening_note: openingNote,
      p_photo_path: photoPath,
      p_photo_mime: photoMime,
    });
  },

  saveStockCount(visitId, items) {
    return supabase.rpc('visit_save_stock_count', { p_visit_id: visitId, p_items: items });
  },

  recordPayment(visitId, method, amount) {
    return supabase.rpc('visit_record_payment', {
      p_visit_id: visitId,
      p_payment_method: method,
      p_amount: amount,
    });
  },

  checkOut({ visitId, latitude, longitude, closingNote, photoPath, photoMime }) {
    return supabase.rpc('visit_check_out', {
      p_visit_id: visitId,
      p_latitude: latitude,
      p_longitude: longitude,
      p_closing_note: closingNote,
      p_photo_path: photoPath,
      p_photo_mime: photoMime,
    });
  },

  resetStockCount(visitId) {
    return supabase.rpc('visit_reset_stock_count', { p_visit_id: visitId });
  },

  async getAuthUserId() {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  },

  async uploadPhoto(file) {
    const folder = await this.getAuthUserId();
    if (!folder) throw new Error('Not authenticated');
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await supabase.storage.from('visit-photos').upload(path, file, {
      contentType: file.type || 'image/jpeg',
    });
    if (error) throw error;
    return path;
  },

  getCurrentPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: null, longitude: null }),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  },
};

export default VisitApiService;
