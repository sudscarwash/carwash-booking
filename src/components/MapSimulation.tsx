/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ZoomIn, ZoomOut, Sliders, Search, X, Maximize2, Minimize2, ExternalLink, Tag, ChevronRight, ChevronDown, Instagram, Sparkles, Calendar, Phone } from 'lucide-react';
import { CarWash, MapPreset } from '../types.js';

const computeDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getInitials = (name: string): string => {
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
};

interface MapSimulationProps {
  locations: CarWash[];
  selectedLocationId?: string | null;
  onLocationSelect?: (loc: CarWash | null) => void;
  onBookLocation?: (loc: CarWash) => void;
  interactiveSelectCoords?: { lat: number; lng: number };
  onMapClickSelectCoords?: (coords: { lat: number; lng: number }) => void;
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  onRadiusChange?: (radius: number) => void;
  onUserLocationChange?: (lat: number, lng: number) => void;
  compact?: boolean;
}

const geocodeQuery = (query: string): { name: string; lat: number; lng: number } | null => {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Exact coordinates match
  const coordsRegex = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  const coordsRegexNoComma = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?)\s+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  
  const match = q.match(coordsRegex) || q.match(coordsRegexNoComma);
  if (match) {
    const parts = q.split(/[\s,]+/);
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { name: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng };
    }
  }

  const bruneiLocations = [
    { name: 'Bandar Seri Begawan (Capital, Brunei)', lat: 4.8917, lng: 114.9401, keys: ['bandar', 'seri', 'begawan', 'bsb', 'capital', 'brunei-muara', 'royal'] },
    { name: 'Gadong (Brunei-Muara)', lat: 4.9015, lng: 114.9175, keys: ['gadong', 'mall', 'be1118'] },
    { name: 'Kiulap (Brunei-Muara)', lat: 4.8892, lng: 114.9284, keys: ['kiulap'] },
    { name: 'Jerudong (Brunei-Muara)', lat: 4.9422, lng: 114.8322, keys: ['jerudong', 'park'] },
    { name: 'Sengkurong (Brunei-Muara)', lat: 4.9250, lng: 114.8500, keys: ['sengkurong', 'bg1121'] },
    { name: 'Berakas (Brunei-Muara)', lat: 4.9350, lng: 114.9450, keys: ['berakas', 'bb3577'] },
    { name: 'Muara Town (Muara)', lat: 5.0211, lng: 115.0683, keys: ['muara', 'port', 'bt1121'] },
    { name: 'Tutong Town (Tutong)', lat: 4.8021, lng: 114.6534, keys: ['tutong', 'ta1131', 'pekan tutong'] },
    { name: 'Kuala Belait (Belait)', lat: 4.5833, lng: 114.2333, keys: ['kuala belait', 'kb', 'belait', 'ka1131'] },
    { name: 'Seria Town (Belait)', lat: 4.6064, lng: 114.3267, keys: ['seria', 'oil', 'kb1133'] },
    { name: 'Bangar Town (Temburong)', lat: 4.7083, lng: 115.0667, keys: ['bangar', 'temburong', 'pa1131'] },
    { name: 'Lambak (Brunei-Muara)', lat: 4.9580, lng: 114.9480, keys: ['lambak'] },
    { name: 'Rimba (Brunei-Muara)', lat: 4.9320, lng: 114.8950, keys: ['rimba'] },
  ];

  for (const loc of bruneiLocations) {
    if (loc.keys.some(k => q.includes(k)) || q.includes(loc.name.toLowerCase())) {
      return { name: loc.name, lat: loc.lat, lng: loc.lng };
    }
  }

  const bruneiPostalCodeRegex = /^([a-z]{2})\s*(\d{4})$/i;
  const postalMatch = q.match(bruneiPostalCodeRegex);
  if (postalMatch) {
    const prefix = postalMatch[1].toUpperCase();
    const digits = parseInt(postalMatch[2]);
    if (['BB', 'BA', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BJ'].includes(prefix)) {
      return { name: `Brunei-Muara Postal Code ${prefix}${digits}`, lat: 4.9100 + (digits % 100) * 0.0005, lng: 114.9300 + (digits % 100) * 0.0005 };
    } else if (['TA', 'TB', 'TC', 'TD'].includes(prefix)) {
      return { name: `Tutong Postal Code ${prefix}${digits}`, lat: 4.8021 + (digits % 100) * 0.0005, lng: 114.6534 + (digits % 100) * 0.0005 };
    } else if (['KA', 'KB', 'KC', 'KD'].includes(prefix)) {
      return { name: `Belait Postal Code ${prefix}${digits}`, lat: 4.5833 + (digits % 100) * 0.0005, lng: 114.2333 + (digits % 100) * 0.0005 };
    } else if (['PA', 'PB'].includes(prefix)) {
      return { name: `Temburong Postal Code ${prefix}${digits}`, lat: 4.7083 + (digits % 100) * 0.0005, lng: 115.0667 + (digits % 100) * 0.0005 };
    }
  }

  const globalCities = [
    { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194, keys: ['sf', 'san francisco', 'california'] },
    { name: 'New York, NY', lat: 40.7128, lng: -74.0060, keys: ['ny', 'new york', 'manhattan'] },
    { name: 'London, UK', lat: 51.5074, lng: -0.1278, keys: ['london', 'uk', 'england'] },
    { name: 'Kuala Lumpur, Malaysia', lat: 3.1390, lng: 101.6869, keys: ['kl', 'kuala lumpur', 'malaysia'] },
    { name: 'Singapore', lat: 1.3521, lng: 103.8198, keys: ['singapore', 'sg'] },
    { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, keys: ['tokyo', 'japan'] },
    { name: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, keys: ['sydney', 'australia'] },
  ];

  for (const loc of globalCities) {
    if (loc.keys.some(k => q.includes(k)) || q.includes(loc.name.toLowerCase())) {
      return { name: loc.name, lat: loc.lat, lng: loc.lng };
    }
  }

  if (q.includes('kampong') || q.includes('kg') || q.includes('brunei') || q.includes('jalan') || q.includes('jln')) {
    const seed = q.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((seed % 100) / 2000) - 0.025; 
    const lngOffset = (((seed * 7) % 100) / 2000) - 0.025;
    return {
      name: `Brunei Area: ${query}`,
      lat: 4.8917 + latOffset,
      lng: 114.9401 + lngOffset
    };
  }

  return null;
};

export const MapSimulation: React.FC<MapSimulationProps> = ({
  locations,
  selectedLocationId,
  onLocationSelect,
  onBookLocation,
  interactiveSelectCoords,
  onMapClickSelectCoords,
  userLat = 4.8917,
  userLng = 114.9401,
  radiusKm = 1,
  onRadiusChange,
  onUserLocationChange,
  compact = false,
}) => {
  const [zoom, setZoom] = useState<number>(13);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dbPresets, setDbPresets] = useState<MapPreset[]>([]);
  const [markerDisplayMode, setMarkerDisplayMode] = useState<'smart' | 'all' | 'dots'>('smart');
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [previewLocation, setPreviewLocation] = useState<CarWash | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [gpsNotification, setGpsNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showRadiusMenu, setShowRadiusMenu] = useState(false);

  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletUserPinRef = useRef<any>(null);
  const leafletNewPinRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Fresh mutable refs for event handlers
  const previewLocationRef = useRef<CarWash | null>(previewLocation);
  previewLocationRef.current = previewLocation;

  const selectedLocationIdRef = useRef<string | null | undefined>(selectedLocationId);
  selectedLocationIdRef.current = selectedLocationId;

  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;

  const onBookLocationRef = useRef(onBookLocation);
  onBookLocationRef.current = onBookLocation;

  const onMapClickSelectCoordsRef = useRef(onMapClickSelectCoords);
  onMapClickSelectCoordsRef.current = onMapClickSelectCoords;

  const onUserLocationChangeRef = useRef(onUserLocationChange);
  onUserLocationChangeRef.current = onUserLocationChange;

  const prevSelectedIdRef = useRef<string | null | undefined>(selectedLocationId);

  // Load Leaflet assets dynamically
  useEffect(() => {
    setMounted(true);
    fetch('/api/map-presets')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDbPresets(data);
        }
      })
      .catch((err) => console.error('Error fetching map presets:', err));

    let active = true;

    // Check if Leaflet is already loaded
    if ((window as any).L) {
      setLeafletLoaded(true);
      return () => {
        setMounted(false);
      };
    }

    // Append Leaflet Stylesheet
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Append Leaflet Script
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        if (active) setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if ((window as any).L) {
          if (active) setLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => {
        active = false;
        setMounted(false);
        clearInterval(interval);
      };
    }

    return () => {
      active = false;
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      const found = locations.find(l => l.id === selectedLocationId);
      if (found) {
        setPreviewLocation(found);
      }
    } else {
      setPreviewLocation(null);
    }
  }, [selectedLocationId, locations]);

  useEffect(() => {
    (window as any).__selectCarWash = (locId: string) => {
      // Toggle off / Unclick if already selected or previewed
      const isCurrent = (previewLocationRef.current?.id === locId) || (selectedLocationIdRef.current === locId);
      if (isCurrent) {
        setPreviewLocation(null);
        if (onLocationSelectRef.current) onLocationSelectRef.current(null);
        if (leafletMapRef.current) leafletMapRef.current.closePopup();
        return;
      }
      const loc = locations.find((l: CarWash) => l.id === locId);
      if (loc) {
        setPreviewLocation(loc);
        if (onLocationSelectRef.current) onLocationSelectRef.current(loc);
        if (leafletMapRef.current) leafletMapRef.current.panTo([loc.locationLat, loc.locationLng]);
      }
    };

    (window as any).__bookCarWash = (locId: string) => {
      const loc = locations.find((l: CarWash) => l.id === locId);
      if (loc) {
        setPreviewLocation(loc);
        if (onBookLocationRef.current) {
          onBookLocationRef.current(loc);
        } else if (onLocationSelectRef.current) {
          onLocationSelectRef.current(loc);
        }
      }
    };

    return () => {
      delete (window as any).__selectCarWash;
      delete (window as any).__bookCarWash;
    };
  }, [locations]);

  const getGoogleMapsCoords = () => {
    if (interactiveSelectCoords) {
      return { lat: interactiveSelectCoords.lat, lng: interactiveSelectCoords.lng };
    }
    if (selectedLocationId) {
      const selectedLoc = locations.find(l => l.id === selectedLocationId);
      if (selectedLoc) {
        return { lat: selectedLoc.locationLat, lng: selectedLoc.locationLng };
      }
    }
    if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
      return { lat: userLat, lng: userLng };
    }
    if (locations.length > 0) {
      return { lat: locations[0].locationLat, lng: locations[0].locationLng };
    }
    return { lat: 4.8917, lng: 114.9401 };
  };

  const currentCenter = getGoogleMapsCoords();

  // Create & Initialize Leaflet Map Instance
  useEffect(() => {
    if (!leafletLoaded || !leafletContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(leafletContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([currentCenter.lat, currentCenter.lng], zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMapRef.current);

      // Handle map clicks: if a location is selected, clicking empty map UNCLICKS it!
      leafletMapRef.current.on('click', (e: any) => {
        if (previewLocationRef.current || selectedLocationIdRef.current) {
          setPreviewLocation(null);
          if (onLocationSelectRef.current) {
            onLocationSelectRef.current(null);
          }
          if (leafletMapRef.current) {
            leafletMapRef.current.closePopup();
          }
          return;
        }

        const coords = { lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) };
        setIsGpsActive(false);
        if (onMapClickSelectCoordsRef.current) {
          onMapClickSelectCoordsRef.current(coords);
        } else if (onUserLocationChangeRef.current) {
          onUserLocationChangeRef.current(coords.lat, coords.lng);
        }
      });

      // Track zoom level changes without resetting when panning/clicking
      leafletMapRef.current.on('zoomend', () => {
        if (leafletMapRef.current) {
          const z = leafletMapRef.current.getZoom();
          setMapZoom(z);
          setZoom(z);
        }
      });
    }

    return () => {
      // Clean up map instance on unmount
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [leafletLoaded, isMaximized]);

  // Sync zoom changes from state to Leaflet map ONLY if zoom was explicitly set and differs
  useEffect(() => {
    if (leafletMapRef.current && leafletMapRef.current.getZoom() !== zoom) {
      leafletMapRef.current.setZoom(zoom);
    }
  }, [zoom]);

  // Sync center movements smoothly WITHOUT resetting the user's current zoom level
  useEffect(() => {
    if (!leafletMapRef.current) return;

    // Pan to newly selected location without changing the user's zoom size
    if (selectedLocationId && selectedLocationId !== prevSelectedIdRef.current) {
      const selectedLoc = locations.find(l => l.id === selectedLocationId);
      if (selectedLoc) {
        leafletMapRef.current.panTo([selectedLoc.locationLat, selectedLoc.locationLng]);
      }
    } else if (interactiveSelectCoords) {
      leafletMapRef.current.panTo([interactiveSelectCoords.lat, interactiveSelectCoords.lng]);
    }
    prevSelectedIdRef.current = selectedLocationId;
  }, [selectedLocationId, interactiveSelectCoords?.lat, interactiveSelectCoords?.lng, locations]);

  // Update map markers, user location pin, and radius circle layers
  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Clear previous elements
    leafletMarkersRef.current.forEach(m => m.remove());
    leafletMarkersRef.current = [];

    if (leafletUserPinRef.current) {
      leafletUserPinRef.current.remove();
      leafletUserPinRef.current = null;
    }
    if (leafletNewPinRef.current) {
      leafletNewPinRef.current.remove();
      leafletNewPinRef.current = null;
    }
    if (leafletCircleRef.current) {
      leafletCircleRef.current.remove();
      leafletCircleRef.current = null;
    }

    // 1. Draw User Location Pin & Radius Circle
    const hasUserCoords = userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng);
    if (hasUserCoords) {
      const isLiveGps = isGpsActive;
      const userIcon = L.divIcon({
        className: 'user-marker-icon',
        html: `<div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full ${isLiveGps ? 'bg-emerald-400' : 'bg-sky-400'} opacity-60"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 ${isLiveGps ? 'bg-emerald-600' : 'bg-sky-600'} border-2 border-white shadow-md"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      leafletUserPinRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(
          isLiveGps
            ? `<div class="font-sans text-xs p-1 text-slate-800">
                 <div class="flex items-center gap-1.5 text-emerald-600 font-extrabold mb-0.5">
                   <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                   <span>Your Live GPS Location</span>
                 </div>
                 <div class="text-[10px] text-slate-500 font-mono">${userLat.toFixed(5)}, ${userLng.toFixed(5)}</div>
               </div>`
            : `<div class="font-sans text-xs p-1 text-slate-800">
                 <div class="flex items-center gap-1.5 text-sky-600 font-extrabold mb-0.5">
                   <span>📍 Search & Filter Center</span>
                 </div>
                 <div class="text-[10px] text-slate-500 font-mono">${userLat.toFixed(5)}, ${userLng.toFixed(5)}</div>
                 <div class="text-[9px] text-slate-400 mt-0.5">Tap anywhere on map to reposition pin</div>
               </div>`
        );

      // Draw Radius range Circle
      if (onRadiusChange || radiusKm) {
        leafletCircleRef.current = L.circle([userLat, userLng], {
          color: isLiveGps ? '#059669' : '#0284c7',
          fillColor: isLiveGps ? '#34d399' : '#38bdf8',
          fillOpacity: 0.12,
          radius: (radiusKm || 1) * 1000
        }).addTo(leafletMapRef.current);
      }
    }

    // 2. Draw onboarding coordinate marker
    if (interactiveSelectCoords) {
      const newPinIcon = L.divIcon({
        className: 'new-pin-icon',
        html: `<div class="flex flex-col items-center">
          <div class="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md border border-rose-400 whitespace-nowrap mb-1">
            New Selection
          </div>
          <div class="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-md"></div>
        </div>`,
        iconSize: [80, 40],
        iconAnchor: [40, 40]
      });

      leafletNewPinRef.current = L.marker([interactiveSelectCoords.lat, interactiveSelectCoords.lng], { icon: newPinIcon })
        .addTo(leafletMapRef.current);
    }

    // 3. Draw Locations Pins with Smart Decluttering
    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const isPreviewed = previewLocation?.id === loc.id;
      const safeName = escapeHtml(loc.name);
      const safeAddress = escapeHtml(loc.address);
      const initials = getInitials(loc.name);
      const hasUserCoords = userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng);
      const distKm = hasUserCoords
        ? computeDistanceKm(userLat, userLng, loc.locationLat, loc.locationLng).toFixed(1)
        : null;

      // Handle co-located markers: If multiple locations share identical or near-identical coordinates (< 35m),
      // apply a radial multi-ring offset so each business has its own distinct, clickable pin even with 10+ in the same spot
      const coLocated = locations.filter(other => 
        Math.abs(other.locationLat - loc.locationLat) < 0.00035 &&
        Math.abs(other.locationLng - loc.locationLng) < 0.00035
      );
      let renderLat = loc.locationLat;
      let renderLng = loc.locationLng;
      if (coLocated.length > 1) {
        const indexInCluster = coLocated.findIndex(o => o.id === loc.id);
        let offsetDist = 0.00022;
        let angle = 0;
        if (coLocated.length <= 5) {
          offsetDist = 0.00020 + coLocated.length * 0.00003;
          angle = (indexInCluster / coLocated.length) * 2 * Math.PI;
        } else {
          // Dynamic 2-ring distribution for 6 to 15+ carwashes in the exact same spot:
          const innerCount = Math.min(4, Math.ceil(coLocated.length * 0.35));
          if (indexInCluster < innerCount) {
            offsetDist = 0.00020; // ~20m inner ring
            angle = (indexInCluster / innerCount) * 2 * Math.PI;
          } else {
            const outerCount = coLocated.length - innerCount;
            const outerIndex = indexInCluster - innerCount;
            offsetDist = 0.00045; // ~45m outer ring
            angle = (outerIndex / outerCount) * 2 * Math.PI + (Math.PI / outerCount);
          }
        }
        renderLat += Math.sin(angle) * offsetDist;
        renderLng += (Math.cos(angle) * offsetDist) / Math.cos((loc.locationLat * Math.PI) / 180);
      }

      // Check nearby density: count how many other car washes are within 350 meters
      const nearbyCount = locations.filter(other => 
        computeDistanceKm(loc.locationLat, loc.locationLng, other.locationLat, other.locationLng) < 0.35
      ).length;
      const isDenseCluster = nearbyCount >= 3;

      // Determine whether to display the expanded name pill or a sleek compact pin
      let shouldShowName = false;
      if (markerDisplayMode === 'all') {
        shouldShowName = true;
      } else if (markerDisplayMode === 'dots') {
        shouldShowName = isSelected;
      } else {
        // 'smart' mode:
        // 1. Currently selected or previewed car wash ALWAYS gets the prominent expanded name pill
        // 2. When zoomed in close to street level (zoom >= 15), roads are wide enough to show all names
        // 3. When zoomed in to neighborhood level (zoom >= 14), show names unless it's a dense cluster (e.g. 10 in same area)
        // 4. When dense cluster or zoomed out, condense to clean letter pins
        if (isSelected || isPreviewed) {
          shouldShowName = true;
        } else if (mapZoom >= 16) {
          shouldShowName = true;
        } else if (mapZoom >= 14 && !isDenseCluster) {
          shouldShowName = true;
        } else {
          shouldShowName = false;
        }
      }

      let markerHtml = '';
      let iconSize: [number, number] = [220, 48];
      let iconAnchor: [number, number] = [110, 46];

      if (shouldShowName) {
        markerHtml = `
          <div class="carwash-marker-pill cursor-pointer flex flex-col items-center select-none hover:z-[9999] transition-transform hover:scale-105 ${isSelected ? 'carwash-marker-selected z-50' : 'z-20'}" style="pointer-events: auto;">
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
              isSelected
                ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white border-white ring-2 ring-sky-300 ring-offset-1 scale-105 shadow-sky-900/40'
                : 'bg-slate-950/92 text-white border-slate-700/80 hover:border-emerald-400 hover:bg-slate-900 shadow-black/40'
            }">
              <span class="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-400'} opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${isSelected ? 'bg-amber-200' : 'bg-emerald-400'}"></span>
              </span>
              <span class="font-black text-[11px] sm:text-xs tracking-tight text-white whitespace-nowrap max-w-[120px] sm:max-w-[160px] truncate leading-none">
                ${safeName}
              </span>
              ${distKm ? `
                <span class="${isSelected ? 'bg-white/20 text-sky-100' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'} text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md shrink-0 leading-none">
                  ${distKm}km
                </span>
              ` : ''}
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid ${isSelected ? '#2563eb' : '#020617'}; margin-top: -1px;"></div>
            <div class="w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-sky-400 ring-2 ring-white' : 'bg-emerald-400 border border-white'} -mt-0.5 shadow-md"></div>
          </div>
        `;
        iconSize = [230, 48];
        iconAnchor = [115, 46];
      } else {
        // Sleek compact circular badge with operator initials - keeps map completely uncluttered even when 10+ are nearby!
        // Instant hover tooltip displaying the full name & distance
        markerHtml = `
          <div class="group cursor-pointer relative flex flex-col items-center select-none transition-transform duration-150 hover:scale-125 hover:z-[9999] ${isSelected ? 'scale-125 z-50' : 'z-10'}" style="pointer-events: auto;">
            <!-- Hover Tooltip showing full name & distance -->
            <div class="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap border border-slate-700/80 z-[10000] flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-400'} shrink-0"></span>
              <span class="max-w-[160px] truncate">${safeName}</span>
              ${distKm ? `<span class="text-sky-300 text-[9px] font-mono font-bold shrink-0">${distKm}km</span>` : ''}
            </div>
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 transition-all ${
              isSelected
                ? 'bg-gradient-to-br from-sky-500 to-indigo-600 border-white ring-4 ring-sky-300/60 shadow-sky-950/50 text-white font-black'
                : 'bg-slate-900 border-emerald-400 hover:border-white shadow-black/50 text-emerald-300 hover:bg-emerald-600 hover:text-white font-extrabold'
            }">
              <span class="text-[10px] sm:text-[11px] font-mono tracking-tight leading-none">${initials}</span>
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-amber-300 ring-1 ring-white' : 'bg-emerald-400 border border-slate-900'}"></span>
            </div>
            <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${isSelected ? '#2563eb' : '#0f172a'}; margin-top: -1px;"></div>
          </div>
        `;
        iconSize = [36, 40];
        iconAnchor = [18, 38];
      }

      const businessIcon = L.divIcon({
        className: `business-marker-container-${loc.id}`,
        html: markerHtml,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
      });

      const popupContent = `
        <div style="min-width: 270px; max-width: 360px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2px;">
          <!-- Header with Initials badge and FULL car wash name with right padding so close button NEVER overlaps -->
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; padding-right: 32px;">
            <div style="width: 38px; height: 38px; border-radius: 11px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; flex-shrink: 0; box-shadow: 0 3px 8px rgba(2, 132, 199, 0.35);">
              ${initials || 'CW'}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 3px; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 1px 6px; font-size: 9.5px; font-weight: 800; text-transform: uppercase;">
                  <span style="display: inline-block; width: 5px; height: 5px; border-radius: 9999px; background-color: #10b981;"></span>
                  Open Now
                </span>
                ${loc.services && loc.services.length > 0 ? `
                  <span style="background-color: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; border-radius: 9999px; padding: 1px 6px; font-size: 9.5px; font-weight: 700;">
                    ${loc.services.length} services
                  </span>
                ` : ''}
              </div>
              <h3 style="margin: 0; font-weight: 900; font-size: 15px; color: #0f172a; line-height: 1.35; word-break: break-word; letter-spacing: -0.01em;">
                ${safeName}
              </h3>
            </div>
          </div>

          <!-- Full Address without truncation -->
          <div style="display: flex; align-items: flex-start; gap: 6px; font-size: 11.5px; color: #334155; margin-bottom: 8px; line-height: 1.45; background-color: #f8fafc; padding: 6px 9px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <span style="color: #e11d48; flex-shrink: 0; font-size: 13px; margin-top: 1px;">📍</span>
            <span style="word-break: break-word; font-weight: 500;">${safeAddress}</span>
          </div>

          <!-- Distance & Phone row -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
            ${distKm ? `
              <div style="display: inline-flex; align-items: center; gap: 4px; background-color: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px;">
                <span>🧭</span>
                <span>${distKm} km away</span>
              </div>
            ` : '<div></div>'}

            ${loc.phone ? `
              <a href="tel:${escapeHtml(loc.phone)}" style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #0284c7; font-weight: 700; text-decoration: underline; background-color: #f8fafc; padding: 2px 7px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span>📞</span>
                <span>${escapeHtml(loc.phone)}</span>
              </a>
            ` : ''}
          </div>

          <!-- Action buttons -->
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
            <button type="button" style="flex: 1; min-width: 130px; padding: 8px 12px; background: linear-gradient(to right, #0284c7, #2563eb); color: #ffffff; border: none; border-radius: 10px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; box-shadow: 0 2px 5px rgba(2, 132, 199, 0.35);" onclick="window.__bookCarWash && window.__bookCarWash('${loc.id}')">
              <span>📅 Book Appointment &rarr;</span>
            </button>
            <a href="https://www.google.com/maps?q=${loc.locationLat},${loc.locationLng}" target="_blank" rel="noopener noreferrer" style="padding: 7px 10px; background-color: #f8fafc; color: #334155; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 11px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
              <span>Directions</span>
            </a>
            ${loc.instagram ? `
              <a href="https://instagram.com/${escapeHtml(loc.instagram)}" target="_blank" rel="noopener noreferrer" style="padding: 7px 10px; background-color: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8; border-radius: 10px; font-size: 11px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                <span>Instagram</span>
              </a>
            ` : ''}
          </div>
        </div>
      `;

      const m = L.marker([renderLat, renderLng], { icon: businessIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(popupContent, {
          maxWidth: 380,
          minWidth: 270,
          autoPan: true,
          autoPanPaddingTopLeft: [20, 75],
          autoPanPaddingBottomRight: [20, 20],
          className: 'custom-leaflet-popup',
        });

      m.on('click', () => {
        const isCurrent = (previewLocationRef.current?.id === loc.id) || (selectedLocationIdRef.current === loc.id);
        if (isCurrent) {
          // Toggle off / Unclick!
          setPreviewLocation(null);
          if (onLocationSelectRef.current) {
            onLocationSelectRef.current(null);
          }
          if (leafletMapRef.current) {
            leafletMapRef.current.closePopup();
          }
          return;
        }

        setPreviewLocation(loc);
        if (onLocationSelectRef.current) {
          onLocationSelectRef.current(loc);
        }
        if (leafletMapRef.current) {
          leafletMapRef.current.panTo([renderLat, renderLng]);
        }
      });

      leafletMarkersRef.current.push(m);
    });

  }, [leafletLoaded, locations, selectedLocationId, userLat, userLng, radiusKm, interactiveSelectCoords, isMaximized, markerDisplayMode, mapZoom, previewLocation, isGpsActive]);

  const sfLandmarks = [
    { name: 'Fisherman\'s Wharf', lat: 37.8080, lng: -122.4177 },
    { name: 'Golden Gate Park', lat: 37.7694, lng: -122.4862 },
    { name: 'Mission District', lat: 37.7599, lng: -122.4148 },
    { name: 'Downtown SF', lat: 37.7749, lng: -122.4194 },
    { name: 'Sunset District', lat: 37.7599, lng: -122.4767 },
  ];

  const landmarks = sfLandmarks;

  const geocodeSuggestion = searchQuery.trim() !== '' ? geocodeQuery(searchQuery) : null;

  const filteredLandmarks = searchQuery.trim() === ''
    ? []
    : landmarks.filter(lm => lm.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const filteredLocations = searchQuery.trim() === ''
    ? []
    : locations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSelectSuggestion = (type: 'landmark' | 'location', item: any) => {
    setSearchQuery(item.name);
    setShowSuggestions(false);
    setIsGpsActive(false);

    if (type === 'landmark') {
      if (onUserLocationChange) {
        onUserLocationChange(item.lat, item.lng);
      } else if (onMapClickSelectCoords) {
        onMapClickSelectCoords({ lat: item.lat, lng: item.lng });
      }
    } else {
      if (onLocationSelect) {
        onLocationSelect(item);
      }
      if (onUserLocationChange) {
        onUserLocationChange(item.locationLat, item.locationLng);
      } else if (onMapClickSelectCoords) {
        onMapClickSelectCoords({ lat: item.locationLat, lng: item.locationLng });
      }
    }
  };

  const handleSearchSubmit = () => {
    if (geocodeSuggestion) {
      handleSelectSuggestion('landmark', geocodeSuggestion);
    } else {
      const foundLandmark = landmarks.find(lm => lm.name.toLowerCase().includes(searchQuery.toLowerCase()));
      if (foundLandmark) {
        handleSelectSuggestion('landmark', foundLandmark);
        return;
      }
      const foundLoc = locations.find(loc => 
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        loc.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (foundLoc) {
        handleSelectSuggestion('location', foundLoc);
      }
    }
  };

  const activePresets = dbPresets.length > 0 ? dbPresets : [
    { id: 'pre_bsb', name: 'Bandar Seri Begawan', lat: 4.8917, lng: 114.9401, country: 'Brunei' },
    { id: 'pre_gadong', name: 'Gadong BE1118', lat: 4.9015, lng: 114.9175, country: 'Brunei' },
    { id: 'pre_kb', name: 'Kuala Belait KA1131', lat: 4.5833, lng: 114.2333, country: 'Brunei' },
    { id: 'pre_tutong', name: 'Tutong TA1131', lat: 4.8021, lng: 114.6534, country: 'Brunei' },
    { id: 'pre_temburong', name: 'Temburong PA1131', lat: 4.7083, lng: 115.0667, country: 'Brunei' },
    { id: 'pre_miri', name: 'Miri (Sarawak)', lat: 4.3995, lng: 113.9914, country: 'Malaysia' },
    { id: 'pre_sf', name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'USA' },
  ];

  const presetsByCountry: Record<string, MapPreset[]> = {};
  activePresets.forEach((preset) => {
    const c = preset.country || 'Brunei';
    if (!presetsByCountry[c]) presetsByCountry[c] = [];
    presetsByCountry[c].push(preset);
  });

  const handlePresetSelect = (preset: MapPreset) => {
    setIsGpsActive(false);
    if (onUserLocationChange) {
      onUserLocationChange(preset.lat, preset.lng);
    } else if (onMapClickSelectCoords) {
      onMapClickSelectCoords({ lat: preset.lat, lng: preset.lng });
    }
  };

  // 1. Live GPS: Request actual device GPS position via browser Geolocation API
  const handleRequestLiveGps = () => {
    if (!navigator.geolocation) {
      setGpsNotification({
        message: 'GPS geolocation is not supported by your browser.',
        type: 'error',
      });
      setTimeout(() => setGpsNotification(null), 5000);
      return;
    }

    setIsLocatingGps(true);
    setGpsNotification({
      message: 'Acquiring high-accuracy device GPS position...',
      type: 'info',
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsLocatingGps(false);
        setIsGpsActive(true);
        setGpsNotification({
          message: `Live GPS acquired! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          type: 'success',
        });
        setTimeout(() => setGpsNotification(null), 4000);

        if (onUserLocationChangeRef.current) {
          onUserLocationChangeRef.current(latitude, longitude);
        } else if (onMapClickSelectCoordsRef.current) {
          onMapClickSelectCoordsRef.current({ lat: latitude, lng: longitude });
        }

        if (leafletMapRef.current) {
          const currentZ = leafletMapRef.current.getZoom() || 15;
          leafletMapRef.current.flyTo([latitude, longitude], Math.max(currentZ, 15), {
            duration: 1.0,
          });
        }

        if (leafletUserPinRef.current) {
          leafletUserPinRef.current.openPopup();
        }
      },
      (error) => {
        setIsLocatingGps(false);
        let errMsg = 'Unable to access your device GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          errMsg = 'Location permission denied. Please allow location access in your browser, or tap on the map to set your pin.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errMsg = 'GPS position unavailable. Please check your device location settings or tap the map.';
        } else if (error.code === error.TIMEOUT) {
          errMsg = 'GPS request timed out. Please retry or click on the map to place your pin.';
        }
        setGpsNotification({
          message: errMsg,
          type: 'error',
        });
        setTimeout(() => setGpsNotification(null), 6000);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // 2. Search Pin: Recenter map view to current search pin / filter center (renamed from My Location)
  const handleRecenterSearchPin = () => {
    if (!leafletMapRef.current) return;
    const targetLat = userLat !== undefined && !isNaN(userLat) ? userLat : 4.8917;
    const targetLng = userLng !== undefined && !isNaN(userLng) ? userLng : 114.9401;

    const currentZ = leafletMapRef.current.getZoom() || zoom;
    leafletMapRef.current.flyTo([targetLat, targetLng], Math.max(currentZ, 14), {
      duration: 0.8,
    });

    if (leafletUserPinRef.current) {
      leafletUserPinRef.current.openPopup();
    }
  };

  const element = (
    <div className={`flex flex-col bg-slate-50 rounded-2xl border border-slate-200/80 p-2 sm:p-3 shadow-xs h-full min-h-[250px] ${
      isMaximized ? 'fixed inset-4 bg-white z-[100] border-slate-300 shadow-2xl m-auto max-w-6xl max-h-[85vh]' : 'w-full'
    }`} id="interactive-map-root">
      
      {/* Single-Row Unified Sleek Top Bar (Height ~38px, High Contrast, Always Visible) */}
      <div className="flex items-center gap-1.5 mb-2 relative z-30 flex-wrap sm:flex-nowrap">
        {/* Search Input & Areas Dropdown */}
        <div className="relative flex-1 min-w-[180px]">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search Brunei (e.g. Gadong, Kiulap, KB)..."
              className="w-full pl-8 pr-16 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500 transition-all text-slate-800"
              id="map-address-search"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit();
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}

            {/* Quick Areas Dropdown inside search */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => setShowPresetsMenu(!showPresetsMenu)}
                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-0.5 border border-slate-200"
                title="Select Brunei districts & popular areas"
                id="map-areas-dropdown-btn"
              >
                <MapPin className="h-3 w-3 text-sky-600" />
                <span className="hidden xs:inline text-[10px]">Areas</span>
                <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showPresetsMenu ? 'rotate-180' : ''}`} />
              </button>

              {showPresetsMenu && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-fade-in text-left">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-100 mb-1">
                    Brunei & Popular Areas
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {activePresets.map((pre) => (
                      <button
                        key={pre.id}
                        type="button"
                        onClick={() => {
                          handlePresetSelect(pre);
                          setShowPresetsMenu(false);
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-sky-50 hover:text-sky-700 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="font-medium truncate">{pre.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">{pre.country}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Search suggestions dropdown list */}
          {showSuggestions && searchQuery.trim() !== '' && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto text-left">
              {geocodeSuggestion && (
                <div
                  onClick={() => handleSelectSuggestion('landmark', geocodeSuggestion)}
                  className="px-3 py-2 hover:bg-sky-50 cursor-pointer text-xs border-b border-slate-100 flex items-center gap-2 font-medium text-sky-700 bg-sky-50/30"
                >
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  <span>Go to: {geocodeSuggestion.name}</span>
                </div>
              )}
              {filteredLandmarks.map((lm, idx) => (
                <div
                  key={`lm-${idx}`}
                  onClick={() => handleSelectSuggestion('landmark', lm)}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{lm.name}</span>
                </div>
              ))}
              {filteredLocations.map((loc) => (
                <div
                  key={`loc-${loc.id}`}
                  onClick={() => handleSelectSuggestion('location', loc)}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs border-b border-slate-100 flex items-center justify-between gap-2 text-slate-700"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 text-emerald-500 fill-emerald-50" />
                    <span className="font-semibold truncate">{loc.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 truncate max-w-xs">{loc.address}</span>
                </div>
              ))}
              {filteredLandmarks.length === 0 && filteredLocations.length === 0 && !geocodeSuggestion && (
                <div className="px-3 py-2.5 text-slate-400 text-xs text-center">
                  No matching landmarks or active business locations.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pin Display Toggle: Names vs Letters vs Auto (ALWAYS VISIBLE on all devices) */}
        <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-0.5 shadow-2xs shrink-0" role="group" aria-label="Pin display format">
          <button
            type="button"
            onClick={() => setMarkerDisplayMode('all')}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              markerDisplayMode === 'all'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Show full name pills for all car washes"
            id="map-mode-names-btn"
          >
            <Tag className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Names</span>
          </button>
          <button
            type="button"
            onClick={() => setMarkerDisplayMode('dots')}
            className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
              markerDisplayMode === 'dots'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Show compact letter pins (ideal for dense areas with multiple car washes nearby)"
            id="map-mode-letters-btn"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-current/20 flex items-center justify-center text-[9px] font-mono font-black leading-none shrink-0">A</span>
            <span className="whitespace-nowrap">Letters</span>
          </button>
          <button
            type="button"
            onClick={() => setMarkerDisplayMode('smart')}
            className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer hidden sm:flex items-center gap-1 ${
              markerDisplayMode === 'smart'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Auto: Letters when crowded, Names when clear or zoomed in"
            id="map-mode-auto-btn"
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="whitespace-nowrap">Auto</span>
          </button>
        </div>

        {/* Compact Radius Filter Pill (if onRadiusChange provided) */}
        {onRadiusChange && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowRadiusMenu(!showRadiusMenu)}
              className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
              title="Filter car washes by distance radius"
              id="map-radius-dropdown-btn"
            >
              <Sliders className="h-3 w-3 text-sky-600 shrink-0" />
              <span className="font-mono font-bold text-sky-900">{radiusKm}km</span>
              <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showRadiusMenu ? 'rotate-180' : ''}`} />
            </button>

            {showRadiusMenu && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 animate-fade-in text-left">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-100 mb-2 flex items-center justify-between">
                  <span>Radius Filter</span>
                  <span className="font-mono text-sky-600 font-bold">{radiusKm} km</span>
                </div>
                <div className="grid grid-cols-5 gap-1 my-1.5">
                  {[1, 3, 5, 10, 25].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => {
                        onRadiusChange(dist);
                        setShowRadiusMenu(false);
                      }}
                      className={`py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all text-center ${
                        radiusKm === dist
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-sky-700 border border-slate-200/80'
                      }`}
                    >
                      {dist}k
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={radiusKm}
                    onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                    id="map-radius-slider"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Maximize / Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMaximized(!isMaximized)}
          className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs"
          title={isMaximized ? "Minimize Map" : "Maximize Map"}
          id="map-top-maximize-btn"
        >
          {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Real Leaflet Map Canvas */}
      <div className="relative flex-1 rounded-xl bg-slate-100/80 border border-slate-200 overflow-hidden min-h-[180px] h-full">
        {!leafletLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full"></div>
            <span className="text-xs text-slate-400 font-medium">Loading interactive map layers...</span>
          </div>
        ) : (
          <div ref={leafletContainerRef} className="w-full h-full z-10" />
        )}

        {/* Floating Quick Preview Card (Mobile & Desktop) */}
        {previewLocation && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md sm:w-[390px] bg-slate-950/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3.5 shadow-2xl z-30 animate-fade-in text-white pointer-events-auto max-h-[65vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2.5 mb-2">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md font-black text-sm ring-2 ring-sky-400/30">
                  {getInitials(previewLocation.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                      Open Now
                    </span>
                    {previewLocation.services && previewLocation.services.length > 0 && (
                      <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        {previewLocation.services.length} services
                      </span>
                    )}
                  </div>
                  {/* Full business name - completely visible without any truncation */}
                  <h4 className="font-black text-sm sm:text-base text-white leading-snug break-words mt-1">
                    {previewLocation.name}
                  </h4>
                  {/* Full address - completely visible with wrapping */}
                  <p className="text-xs text-slate-300 flex items-start gap-1.5 mt-1 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="break-words font-medium">{previewLocation.address}</span>
                  </p>
                  {previewLocation.phone && (
                    <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                      <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <a href={`tel:${previewLocation.phone}`} className="text-sky-300 hover:text-sky-200 font-semibold underline">
                        {previewLocation.phone}
                      </a>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewLocation(null);
                    if (onLocationSelectRef.current) onLocationSelectRef.current(null);
                    if (leafletMapRef.current) leafletMapRef.current.closePopup();
                  }}
                  className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Unselect car wash"
                  id="preview-deselect-btn"
                >
                  Unselect
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewLocation(null);
                    if (onLocationSelectRef.current) onLocationSelectRef.current(null);
                    if (leafletMapRef.current) leafletMapRef.current.closePopup();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                  title="Close preview & unselect"
                  id="preview-close-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng) && (
              <div className="text-xs text-slate-300 font-medium mb-2.5 flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-sky-300 font-bold flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  Distance:
                </span>
                <span className="font-extrabold text-white font-mono bg-sky-950 px-2 py-0.5 rounded border border-sky-800/80">
                  {computeDistanceKm(userLat, userLng, previewLocation.locationLat, previewLocation.locationLng).toFixed(1)} km away
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {(onBookLocation || onLocationSelect) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onBookLocation) {
                      onBookLocation(previewLocation);
                    } else if (onLocationSelect) {
                      onLocationSelect(previewLocation);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-md hover:shadow-sky-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <a
                href={`https://www.google.com/maps?q=${previewLocation.locationLat},${previewLocation.locationLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0 hover:border-slate-600"
                title="Open GPS Navigation in Google Maps"
              >
                <ExternalLink className="w-4 h-4 text-rose-400" />
              </a>

              {previewLocation.instagram && (
                <a
                  href={`https://instagram.com/${previewLocation.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-700/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0 hover:border-slate-600"
                  title="Open Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Real-time GPS Notification Toast */}
        {gpsNotification && (
          <div
            className={`absolute top-2.5 left-2.5 right-2.5 sm:left-auto sm:right-3 max-w-sm z-30 p-2.5 rounded-xl border text-xs shadow-xl flex items-center justify-between gap-2 animate-fade-in ${
              gpsNotification.type === 'success'
                ? 'bg-emerald-950/95 text-emerald-200 border-emerald-700/80 backdrop-blur-md'
                : gpsNotification.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-700/80 backdrop-blur-md'
                : 'bg-slate-900/95 text-sky-200 border-slate-700 backdrop-blur-md'
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2 min-w-0">
              {gpsNotification.type === 'success' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
              ) : gpsNotification.type === 'error' ? (
                <X className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <span className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0"></span>
              )}
              <span className="text-[11px] font-medium truncate break-words">{gpsNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setGpsNotification(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Compact Vertical Zoom Stack (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col rounded-xl border border-slate-200/90 bg-white/95 shadow-md overflow-hidden z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (leafletMapRef.current) {
                leafletMapRef.current.zoomIn();
              } else {
                setZoom((prev) => Math.min(18, prev + 1));
              }
            }}
            className="p-1.5 hover:bg-slate-100 text-slate-700 transition-colors border-b border-slate-100 flex items-center justify-center cursor-pointer"
            title="Zoom In"
            id="map-zoom-in-btn"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (leafletMapRef.current) {
                leafletMapRef.current.zoomOut();
              } else {
                setZoom((prev) => Math.max(10, prev - 1));
              }
            }}
            className="p-1.5 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
            title="Zoom Out"
            id="map-zoom-out-btn"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Sleek Floating Action Controls (Bottom-Right, Compact, Non-Obtrusive) */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 border border-slate-200/90 bg-white/95 backdrop-blur-md p-1 rounded-full shadow-lg z-20 pointer-events-auto">
          {/* Button 1: Live GPS */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRequestLiveGps();
            }}
            disabled={isLocatingGps}
            className={`px-2.5 py-1 rounded-full shadow-2xs transition-all flex items-center gap-1 cursor-pointer text-xs font-bold shrink-0 ${
              isLocatingGps
                ? 'bg-emerald-700 text-white opacity-80 cursor-wait'
                : isGpsActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-1'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Locate via device GPS coordinates"
            id="map-live-gps-btn"
          >
            <Navigation className={`h-3 w-3 fill-white/40 shrink-0 ${isLocatingGps ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-extrabold whitespace-nowrap">
              {isLocatingGps ? 'Locating...' : 'Live GPS'}
            </span>
            {isGpsActive && !isLocatingGps && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse shrink-0"></span>
            )}
          </button>

          {/* Button 2: Search Pin */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRecenterSearchPin();
            }}
            className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-2xs transition-all flex items-center gap-1 cursor-pointer text-xs font-bold shrink-0"
            title="Center map on your active Search Pin location"
            id="map-search-pin-btn"
          >
            <MapPin className="h-3 w-3 fill-white/30 shrink-0" />
            <span className="text-[10px] font-extrabold whitespace-nowrap">Search Pin</span>
          </button>

          {/* Button 3: Google Maps Link */}
          <a
            href={`https://www.google.com/maps?q=${currentCenter.lat},${currentCenter.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-slate-100 text-rose-600 rounded-full transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Open real coordinates on Google Maps"
            id="map-gmaps-link"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {/* Button 4: Unselect Active Pin (Only when pin selected) */}
          {(previewLocation || selectedLocationId) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewLocation(null);
                if (onLocationSelectRef.current) onLocationSelectRef.current(null);
                if (leafletMapRef.current) leafletMapRef.current.closePopup();
              }}
              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-full border border-rose-200 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Unselect car wash"
              id="map-unselect-btn"
            >
              <X className="h-3 w-3 shrink-0" />
              <span className="text-[10px] font-bold whitespace-nowrap">Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isMaximized && mounted) {
    return createPortal(element, document.body);
  }

  return element;
};
