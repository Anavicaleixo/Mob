/**
 * Traffic Service
 * Handles calculations for traffic factors, ETAs, and arrival times based on peak hours.
 */

const PEAK_HOURS = [
  { start: 7, end: 9 },   // Morning rush
  { start: 17, end: 19 }  // Evening rush
];

export const trafficService = {
  /**
   * Checks if the current time falls within defined peak hours.
   * @returns {boolean}
   */
  isPeakHour: () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Peak hours only on weekdays (Monday-Friday)
    if (day === 0 || day === 6) return false;
    
    return PEAK_HOURS.some(peak => hour >= peak.start && hour < peak.end);
  },

  /**
   * Returns a traffic multiplier factor.
   * 1.0 = Normal
   * 1.8 = Heavy traffic
   * @returns {number}
   */
  getTrafficFactor: () => {
    return trafficService.isPeakHour() ? 1.8 : 1.0;
  },

  /**
   * Calculates ETA in minutes based on distance and current traffic.
   * @param {number} distanceMeters 
   * @param {number} baseSpeedKmh Default average bus speed in urban areas
   * @returns {number} Minutes
   */
  calculateETAMinutes: (distanceMeters, baseSpeedKmh = 25) => {
    const trafficFactor = trafficService.getTrafficFactor();
    const distanceKm = distanceMeters / 1000;
    
    // Time = Distance / Speed
    // Speed is reduced by the traffic factor
    const effectiveSpeedKmh = baseSpeedKmh / trafficFactor;
    const hours = distanceKm / effectiveSpeedKmh;
    
    return Math.max(1, Math.round(hours * 60));
  },

  /**
   * Formats a duration in minutes to a human-readable string.
   * @param {number} minutes 
   * @returns {string}
   */
  formatDuration: (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  },

  /**
   * Calculates the absolute arrival time based on a duration.
   * @param {number} durationMinutes 
   * @returns {string} Formatted HH:MM
   */
  getArrivalTime: (durationMinutes) => {
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + durationMinutes * 60000);
    return arrivalDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  },

  /**
   * Gets current time in HH:MM format.
   * @returns {string}
   */
  getCurrentTime: () => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
};
