import { Order } from '../types';
export * from './geoUtils';

export const BRUNEI_DISTRICTS = ['Brunei-Muara', 'Tutong', 'Belait', 'Temburong'] as const;
export type BruneiDistrict = typeof BRUNEI_DISTRICTS[number];

export interface DistrictRouteInfo {
  originDistrict: string;
  destinationDistrict: string;
  distanceKm: number;
  defaultFee: number;
  maxCeilingFee?: number; // Anti-price gouging ceiling cap (e.g. max $22 for Belait-Muara)
  estimatedMinutes: string;
  isCrossDistrict: boolean;
  description: string;
}

export const STANDARD_DISTRICT_ROUTES: Record<string, DistrictRouteInfo> = {
  'Brunei-Muara->Brunei-Muara': {
    originDistrict: 'Brunei-Muara',
    destinationDistrict: 'Brunei-Muara',
    distanceKm: 12,
    defaultFee: 3.50,
    estimatedMinutes: '20-35 mins',
    isCrossDistrict: false,
    description: 'Local Capital Zone (Bandar, Kiulap, Gadong, Berakas)'
  },
  'Tutong->Tutong': {
    originDistrict: 'Tutong',
    destinationDistrict: 'Tutong',
    distanceKm: 14,
    defaultFee: 4.00,
    estimatedMinutes: '20-35 mins',
    isCrossDistrict: false,
    description: 'Local Tutong District (Tutong Town, Telisai, Lamunin)'
  },
  'Belait->Belait': {
    originDistrict: 'Belait',
    destinationDistrict: 'Belait',
    distanceKm: 15,
    defaultFee: 5.00,
    estimatedMinutes: '20-35 mins',
    isCrossDistrict: false,
    description: 'Local Belait District (Kuala Belait, Seria, Lumut)'
  },
  'Temburong->Temburong': {
    originDistrict: 'Temburong',
    destinationDistrict: 'Temburong',
    distanceKm: 14,
    defaultFee: 4.00,
    estimatedMinutes: '20-35 mins',
    isCrossDistrict: false,
    description: 'Local Temburong District (Bangar, Labu)'
  },
  'Brunei-Muara->Tutong': {
    originDistrict: 'Brunei-Muara',
    destinationDistrict: 'Tutong',
    distanceKm: 48,
    defaultFee: 8.00,
    estimatedMinutes: '40-55 mins',
    isCrossDistrict: true,
    description: 'Cross-District Coastal Highway (Muara ➔ Tutong)'
  },
  'Tutong->Brunei-Muara': {
    originDistrict: 'Tutong',
    destinationDistrict: 'Brunei-Muara',
    distanceKm: 48,
    defaultFee: 8.00,
    estimatedMinutes: '40-55 mins',
    isCrossDistrict: true,
    description: 'Cross-District Coastal Highway (Tutong ➔ Muara)'
  },
  'Brunei-Muara->Belait': {
    originDistrict: 'Brunei-Muara',
    destinationDistrict: 'Belait',
    distanceKm: 108,
    defaultFee: 16.00,
    estimatedMinutes: '70-90 mins',
    isCrossDistrict: true,
    description: 'Long-Haul Inter-District Highway (Muara ➔ KB/Seria)'
  },
  'Belait->Brunei-Muara': {
    originDistrict: 'Belait',
    destinationDistrict: 'Brunei-Muara',
    distanceKm: 108,
    defaultFee: 16.00,
    estimatedMinutes: '70-90 mins',
    isCrossDistrict: true,
    description: 'Long-Haul Inter-District Highway (KB/Seria ➔ Muara)'
  },
  'Tutong->Belait': {
    originDistrict: 'Tutong',
    destinationDistrict: 'Belait',
    distanceKm: 62,
    defaultFee: 10.00,
    estimatedMinutes: '50-65 mins',
    isCrossDistrict: true,
    description: 'Cross-District Southwestern Highway (Tutong ➔ Belait)'
  },
  'Belait->Tutong': {
    originDistrict: 'Belait',
    destinationDistrict: 'Tutong',
    distanceKm: 62,
    defaultFee: 10.00,
    estimatedMinutes: '50-65 mins',
    isCrossDistrict: true,
    description: 'Cross-District Southwestern Highway (Belait ➔ Tutong)'
  },
  'Brunei-Muara->Temburong': {
    originDistrict: 'Brunei-Muara',
    destinationDistrict: 'Temburong',
    distanceKm: 38,
    defaultFee: 12.00,
    estimatedMinutes: '45-60 mins',
    isCrossDistrict: true,
    description: 'Cross-District Via SHOAS Sea Bridge'
  },
  'Temburong->Brunei-Muara': {
    originDistrict: 'Temburong',
    destinationDistrict: 'Brunei-Muara',
    distanceKm: 38,
    defaultFee: 12.00,
    estimatedMinutes: '45-60 mins',
    isCrossDistrict: true,
    description: 'Cross-District Via SHOAS Sea Bridge'
  },
  'Tutong->Temburong': {
    originDistrict: 'Tutong',
    destinationDistrict: 'Temburong',
    distanceKm: 85,
    defaultFee: 18.00,
    estimatedMinutes: '75-95 mins',
    isCrossDistrict: true,
    description: 'Inter-District Via Tutong Highway & SHOAS Bridge'
  },
  'Temburong->Tutong': {
    originDistrict: 'Temburong',
    destinationDistrict: 'Tutong',
    distanceKm: 85,
    defaultFee: 18.00,
    estimatedMinutes: '75-95 mins',
    isCrossDistrict: true,
    description: 'Inter-District Via SHOAS Bridge & Tutong Highway'
  },
  'Belait->Temburong': {
    originDistrict: 'Belait',
    destinationDistrict: 'Temburong',
    distanceKm: 145,
    defaultFee: 24.00,
    estimatedMinutes: '105-130 mins',
    isCrossDistrict: true,
    description: 'Trans-Brunei Long Haul (Belait ➔ Temburong)'
  },
  'Temburong->Belait': {
    originDistrict: 'Temburong',
    destinationDistrict: 'Belait',
    distanceKm: 145,
    defaultFee: 24.00,
    estimatedMinutes: '105-130 mins',
    isCrossDistrict: true,
    description: 'Trans-Brunei Long Haul (Temburong ➔ Belait)'
  }
};

/**
 * Calculates route, distance, fee, and ETA between origin and destination districts.
 * Enforces strict platform price ceiling caps to prevent courier price gouging (e.g. asking $100).
 */
export function getDistrictRoute(
  originDistrict: string = 'Brunei-Muara',
  destinationDistrict: string = 'Brunei-Muara',
  customRunnerRates?: Record<string, number>
): DistrictRouteInfo {
  const normOrigin = originDistrict.trim() || 'Brunei-Muara';
  const normDest = destinationDistrict.trim() || 'Brunei-Muara';
  const routeKey = `${normOrigin}->${normDest}`;

  const standardRoute = STANDARD_DISTRICT_ROUTES[routeKey];
  if (standardRoute) {
    // Determine dynamic ceiling cap (e.g. standard route fee + $6 or specified cap)
    const ceilingCap = standardRoute.maxCeilingFee || Math.min(30.00, Math.round(standardRoute.defaultFee * 1.5));
    
    // Check if custom rate exists
    const customFee = customRunnerRates?.[routeKey];
    let effectiveFee = standardRoute.defaultFee;
    
    if (customFee !== undefined) {
      // Strictly prevent price gouging: runner fee cannot exceed the platform ceiling cap
      effectiveFee = Math.min(Math.max(customFee, standardRoute.defaultFee * 0.7), ceilingCap);
    }

    return {
      ...standardRoute,
      maxCeilingFee: ceilingCap,
      defaultFee: effectiveFee,
    };
  }

  // Fallback for identical or unspecified routes
  const isCross = normOrigin.toLowerCase() !== normDest.toLowerCase();
  const baseFee = isCross ? 8.00 : 3.50;
  const ceilingFee = isCross ? 14.00 : 6.00;
  return {
    originDistrict: normOrigin,
    destinationDistrict: normDest,
    distanceKm: isCross ? 50 : 12,
    defaultFee: baseFee,
    maxCeilingFee: ceilingFee,
    estimatedMinutes: isCross ? '45-60 mins' : '20-35 mins',
    isCrossDistrict: isCross,
    description: isCross ? `Cross-District (${normOrigin} ➔ ${normDest})` : `Local ${normOrigin}`
  };
}

/**
 * Checks if a runner is eligible to claim an order based on their base district and preferences.
 */
export interface RunnerDistrictSettings {
  baseDistrict?: string;
  runnerBaseDistrict?: string;
  crossDistrictEnabled?: boolean;
  runnerCrossDistrictEnabled?: boolean;
  coveredDistricts?: string[];
  runnerCoveredDistricts?: string[];
}

/**
 * Checks if a runner is eligible to claim an order based on their base district and preferences.
 * Supports passing either (runner, order) or (order, runner).
 */
export function isRunnerEligibleForOrder(
  arg1: any,
  arg2: any
): { eligible: boolean; reason?: string } {
  // Determine which argument is order and which is runner
  const isArg1Order = arg1 && ('orderNumber' in arg1 || 'restaurantId' in arg1 || 'deliveryAddress' in arg1);
  const order: Order = isArg1Order ? arg1 : arg2;
  const runner: RunnerDistrictSettings = isArg1Order ? arg2 : arg1;

  if (!order) return { eligible: false, reason: 'Invalid order' };

  const runnerBase = runner?.runnerBaseDistrict || runner?.baseDistrict || 'Brunei-Muara';
  const crossEnabled = runner?.runnerCrossDistrictEnabled ?? runner?.crossDistrictEnabled ?? true;
  const covered = runner?.runnerCoveredDistricts || runner?.coveredDistricts || [runnerBase];

  const orderOrigin = order.restaurantDistrict || 'Brunei-Muara';
  const orderDest = order.deliveryDistrict || order.deliveryAddress?.city || 'Brunei-Muara';

  // If order is purely local to runner's base district
  if (orderOrigin === runnerBase && orderDest === runnerBase) {
    return { eligible: true };
  }

  // If runner does NOT do cross-district, but order requires leaving runner's base
  if (!crossEnabled) {
    if (orderOrigin !== runnerBase || orderDest !== runnerBase) {
      return {
        eligible: false,
        reason: `Courier is set to Local Only (${runnerBase}). Route is ${orderOrigin} ➔ ${orderDest}.`
      };
    }
  }

  // If runner has crossDistrictEnabled, check if they cover the destination district
  if (covered && covered.length > 0) {
    if (!covered.includes(orderDest)) {
      return {
        eligible: false,
        reason: `Courier territory does not include ${orderDest}.`
      };
    }
  }

  return { eligible: true };
}
