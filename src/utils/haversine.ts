/**
 * Haversine Geodesic Distance Utilities
 *
 * Provides accurate great-circle calculations between GPS coordinates
 * and enforces the station arrival threshold (< 100 meters).
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ProximityEvaluation {
  distanceKm: number;
  distanceMeters: number;
  etaMinutes: number;
  isAtBay: boolean;
  proximityStatus: 'ARRIVED' | 'EN_ROUTE';
  formattedDistance: string;
}

/**
 * Arrival threshold in meters (100 meters)
 */
export const AT_BAY_DISTANCE_THRESHOLD_METERS = 100;
export const AT_BAY_DISTANCE_THRESHOLD_KM = 0.10;

/**
 * Calculates great-circle distance between two GPS coordinates using the Haversine formula.
 *
 * @param coord1 First coordinate pair (latitude, longitude in degrees)
 * @param coord2 Second coordinate pair (latitude, longitude in degrees)
 * @returns Distance in kilometers
 */
export function calculateHaversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  if (
    coord1.lat == null ||
    coord1.lng == null ||
    coord2.lat == null ||
    coord2.lng == null ||
    isNaN(coord1.lat) ||
    isNaN(coord1.lng) ||
    isNaN(coord2.lat) ||
    isNaN(coord2.lng)
  ) {
    return 0;
  }

  const toRad = (degree: number) => (degree * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in kilometers

  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const lat1Rad = toRad(coord1.lat);
  const lat2Rad = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDistanceKm = R * c;

  // Round to 2 decimal places (precision of ~10 meters)
  return Math.round(rawDistanceKm * 100) / 100;
}

/**
 * Calculates great-circle distance between two GPS coordinates in meters.
 */
export function calculateHaversineDistanceMeters(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const km = calculateHaversineDistanceKm(coord1, coord2);
  return Math.round(km * 1000);
}

/**
 * Checks whether user coordinates are within the 'At Bay' (< 100 meters) arrival threshold.
 */
export function isUserAtBay(
  userCoords: Coordinates,
  stationCoords: Coordinates,
  thresholdMeters: number = AT_BAY_DISTANCE_THRESHOLD_METERS
): boolean {
  const meters = calculateHaversineDistanceMeters(userCoords, stationCoords);
  return meters <= thresholdMeters;
}

/**
 * Evaluates the proximity status, distance, driving ETA, and threshold flags.
 *
 * @param userCoords Current GPS coordinates of the user/customer
 * @param stationCoords Registered GPS coordinates of the car wash station
 * @param averageSpeedKmh Average urban drive speed (defaults to 30 km/h)
 */
export function evaluateProximity(
  userCoords: Coordinates,
  stationCoords: Coordinates,
  averageSpeedKmh: number = 30
): ProximityEvaluation {
  const distanceKm = calculateHaversineDistanceKm(userCoords, stationCoords);
  const distanceMeters = Math.round(distanceKm * 1000);
  const isAtBay = distanceMeters <= AT_BAY_DISTANCE_THRESHOLD_METERS;
  const proximityStatus: 'ARRIVED' | 'EN_ROUTE' = isAtBay ? 'ARRIVED' : 'EN_ROUTE';

  // ETA in minutes, minimum 1 minute if en route
  const etaMinutes = isAtBay ? 0 : Math.max(1, Math.round((distanceKm / averageSpeedKmh) * 60));

  const formattedDistance = isAtBay
    ? '📍 At Bay (<100m)'
    : distanceKm < 1
    ? `~${distanceMeters}m`
    : `~${distanceKm}km`;

  return {
    distanceKm,
    distanceMeters,
    etaMinutes,
    isAtBay,
    proximityStatus,
    formattedDistance,
  };
}
