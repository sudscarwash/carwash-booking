/**
 * Geolocation Live Watch Service
 *
 * Provides real-time geolocation tracking using navigator.geolocation.watchPosition.
 * Automatically checks the user's distance to the car wash station and notifies
 * both the customer and the station staff when the user crosses the <100m threshold ("At Bay").
 *
 * Browser Background Tracking Considerations:
 * - When the app tab/PWA is in the foreground or active, `watchPosition` runs continuously.
 * - When backgrounded or screen locked, mobile browsers throttle timers and suspend non-active JS execution.
 * - This service provides an auto-stopping watch session once "At Bay" is reached to preserve battery life and data.
 */

import { Coordinates, calculateHaversineDistanceMeters, AT_BAY_DISTANCE_THRESHOLD_METERS } from './haversine.js';

export interface WatchProximityOptions {
  bookingId: string;
  stationCoords: Coordinates;
  onUpdate?: (data: {
    meters: number;
    isAtBay: boolean;
    lat: number;
    lng: number;
  }) => void;
  onThresholdCrossed?: (data: {
    meters: number;
    lat: number;
    lng: number;
  }) => void;
  onError?: (error: GeolocationPositionError) => void;
  thresholdMeters?: number;
  autoStopOnArrival?: boolean;
}

class GeolocationWatchService {
  private activeWatchId: number | null = null;
  private currentBookingId: string | null = null;
  private lastReportedMeters: number | null = null;
  private hasCrossedThreshold: boolean = false;

  public isTracking(): boolean {
    return this.activeWatchId !== null;
  }

  public getTrackingBookingId(): string | null {
    return this.currentBookingId;
  }

  /**
   * Starts watching customer location toward the destination station.
   */
  public startWatch(options: WatchProximityOptions): boolean {
    if (!('geolocation' in navigator)) {
      console.warn('[GeolocationWatch] Geolocation is not supported by this browser.');
      return false;
    }

    // Stop any existing watch first
    this.stopWatch();

    const threshold = options.thresholdMeters ?? AT_BAY_DISTANCE_THRESHOLD_METERS;
    const autoStop = options.autoStopOnArrival ?? true;
    this.currentBookingId = options.bookingId;
    this.hasCrossedThreshold = false;
    this.lastReportedMeters = null;

    try {
      this.activeWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const userCoords: Coordinates = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          const meters = calculateHaversineDistanceMeters(userCoords, options.stationCoords);
          const isAtBay = meters <= threshold;

          this.lastReportedMeters = meters;

          // Invoke general update callback
          if (options.onUpdate) {
            options.onUpdate({
              meters,
              isAtBay,
              lat: userCoords.lat,
              lng: userCoords.lng,
            });
          }

          // Check if crossed threshold
          if (isAtBay && !this.hasCrossedThreshold) {
            this.hasCrossedThreshold = true;
            if (options.onThresholdCrossed) {
              options.onThresholdCrossed({
                meters,
                lat: userCoords.lat,
                lng: userCoords.lng,
              });
            }

            // Once arrived at the bay, stop watching to save battery & data
            if (autoStop) {
              this.stopWatch();
            }
          }
        },
        (err) => {
          console.warn('[GeolocationWatch] Position error:', err);
          if (options.onError) {
            options.onError(err);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );

      return true;
    } catch (e) {
      console.error('[GeolocationWatch] Failed to initialize watchPosition:', e);
      return false;
    }
  }

  /**
   * Stops the active geolocation watch session.
   */
  public stopWatch(): void {
    if (this.activeWatchId !== null) {
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
    this.currentBookingId = null;
    this.lastReportedMeters = null;
    this.hasCrossedThreshold = false;
  }
}

export const geolocationWatchService = new GeolocationWatchService();
