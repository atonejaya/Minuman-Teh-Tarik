const prisma = require('../config/database');

class GpsService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distance in meters
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;

    const toRad = (value) => (value * Math.PI) / 180;

    const R = 6371e3; // Earth radius in meters
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return Math.round(distance);
  }

  /**
   * Get maximum allowed radius from Setting, default 100 meters
   * @returns {Promise<number>}
   */
  static async getMaxRadius() {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'VISIT_MAX_RADIUS_METER' }
      });
      if (setting && setting.value) {
        return parseInt(setting.value, 10);
      }
    } catch (error) {
      console.warn("Failed to fetch VISIT_MAX_RADIUS_METER setting, using default 100", error);
    }
    return 100;
  }

  /**
   * Validate if the given distance is within the allowed radius
   * @param {number} distance 
   * @returns {Promise<{valid: boolean, maxRadius: number}>}
   */
  static async validateRadius(distance) {
    const maxRadius = await this.getMaxRadius();
    return {
      valid: distance <= maxRadius,
      maxRadius
    };
  }
}

module.exports = GpsService;
