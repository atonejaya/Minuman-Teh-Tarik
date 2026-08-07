'use strict';

/**
 * VisitTimelineService (SPRINT 11.0E)
 * Domain service murni untuk membangun timeline kunjungan:
 * - aktivitas diurutkan kronologis (occurred_at lalu id sebagai tie-breaker)
 * - menghitung durasi kunjungan (detik)
 * Timeline bersifat immutable / append-only.
 */
class VisitTimelineService {
  /**
   * Urutkan aktivitas secara kronologis ascending.
   * @param {Array<{occurred_at: Date|string, id: number}>} activities
   * @returns {Array} salinan terurut
   */
  buildTimeline(activities = []) {
    return [...activities].sort((a, b) => {
      const ta = new Date(a.occurred_at).getTime();
      const tb = new Date(b.occurred_at).getTime();
      if (ta !== tb) return ta - tb;
      return Number(a.id) - Number(b.id);
    });
  }

  /**
   * Durasi kunjungan dalam detik.
   * @param {Date|string} checkInTime
   * @param {Date|string} checkOutTime
   * @returns {number} durasi detik (>= 0), null bila salah satu tidak ada
   */
  computeDuration(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return null;
    const start = new Date(checkInTime).getTime();
    const end = new Date(checkOutTime).getTime();
    if (Number.isNaN(start) || Number.isNaN(end)) return null;
    return Math.max(0, Math.round((end - start) / 1000));
  }

  /**
   * Serialisasi satu aktivitas menjadi bentuk timeline.
   */
  toTimelineEntry(activity) {
    return {
      id: activity.id,
      type: activity.type,
      occurred_at: activity.occurred_at,
      metadata: activity.metadata || null,
      created_by: activity.created_by
    };
  }
}

module.exports = new VisitTimelineService();
