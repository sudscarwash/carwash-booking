export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Standard GPS centroids and key logistics hubs for Brunei Darussalam's four districts.
 */
export const BRUNEI_DISTRICT_CENTROIDS: Record<string, GeoCoordinates> = {
  'Brunei-Muara': {
    latitude: 4.8903,
    longitude: 114.9404, // Bandar Seri Begawan central zone
  },
  'Tutong': {
    latitude: 4.8021,
    longitude: 114.6510, // Pekan Tutong / Bukit Bendera
  },
  'Belait': {
    latitude: 4.5821,
    longitude: 114.2312, // Kuala Belait / Seria oil & gas corridor
  },
  'Temburong': {
    latitude: 4.7123,
    longitude: 115.1432, // Bangar town center (post-CCK Bridge link)
  },
};

/**
 * Calculates straight-line distance (in kilometers) between two GPS points using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  coord1: { latitude: number; longitude: number } | { lat: number; lng: number },
  coord2: { latitude: number; longitude: number } | { lat: number; lng: number }
): number {
  const lat1 = 'latitude' in coord1 ? coord1.latitude : coord1.lat;
  const lon1 = 'longitude' in coord1 ? coord1.longitude : coord1.lng;
  const lat2 = 'latitude' in coord2 ? coord2.latitude : coord2.lat;
  const lon2 = 'longitude' in coord2 ? coord2.longitude : coord2.lng;

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return parseFloat(d.toFixed(2));
}

/**
 * Checks if a runner or entity is within a designated geofence radius (in meters).
 */
export function isWithinGeofence(
  currentPos: { latitude: number; longitude: number } | { lat: number; lng: number },
  targetPos: { latitude: number; longitude: number } | { lat: number; lng: number },
  radiusMeters: number = 50
): boolean {
  const distanceKm = calculateHaversineDistanceKm(currentPos, targetPos);
  return distanceKm * 1000 <= radiusMeters;
}

/**
 * Formats GPS coordinates to standard 4-decimal precision (~11-meter optical resolution).
 */
export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
}

/**
 * Generates turn-by-turn navigation URL for Google Maps.
 */
export function getGoogleMapsNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Generates Waze navigation URL for mobile users in Brunei.
 */
export function getWazeNavigationUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
