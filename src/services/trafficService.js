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
  // Calculates ETA in minutes for vehicle (bus) trips based on distance and traffic.
  calculateETAMinutes: (distanceMeters, baseSpeedKmh = 25) => {
    // Minimum ETA for very short distances (e.g., bus just arrived)
    if (distanceMeters < 200) return 1; // 1 minute minimum
    const trafficFactor = trafficService.getTrafficFactor();
    const distanceKm = distanceMeters / 1000;
    // Effective speed reduced by traffic factor
    const effectiveSpeedKmh = baseSpeedKmh / trafficFactor;
    const hours = distanceKm / effectiveSpeedKmh;
    // Ensure a realistic lower bound (at least 2 minutes for any non‑trivial distance)
    return Math.max(2, Math.round(hours * 60));
  },

  // Calculates ETA in minutes for walking trips.
  calculateWalkingMinutes: (distanceMeters, walkingSpeedKmh = 5) => {
    // Minimum ETA for very short distances
    if (distanceMeters < 200) return 1;
    const distanceKm = distanceMeters / 1000;
    const hours = distanceKm / walkingSpeedKmh;
    return Math.max(2, Math.round(hours * 60));
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


