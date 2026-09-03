/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ZoomIn, ZoomOut, Sliders, Search, X, Maximize2, Minimize2, ExternalLink, Tag, ChevronRight, Instagram, Sparkles, Calendar } from 'lucide-react';
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
  selectedLocationId?: string;
  onLocationSelect?: (loc: CarWash) => void;
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

  const leafletContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkersRef = useRef<any[]>([]);
  const leafletUserPinRef = useRef<any>(null);
  const leafletNewPinRef = useRef<any>(null);
  const leafletCircleRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

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
    }
  }, [selectedLocationId, locations]);

  useEffect(() => {
    (window as any).__selectCarWash = (locId: string) => {
      const loc = locations.find((l: CarWash) => l.id === locId);
      if (loc) {
        setPreviewLocation(loc);
        if (onLocationSelect) onLocationSelect(loc);
        if (leafletMapRef.current) leafletMapRef.current.panTo([loc.locationLat, loc.locationLng]);
      }
    };

    (window as any).__bookCarWash = (locId: string) => {
      const loc = locations.find((l: CarWash) => l.id === locId);
      if (loc) {
        setPreviewLocation(loc);
        if (onBookLocation) {
          onBookLocation(loc);
        } else if (onLocationSelect) {
          onLocationSelect(loc);
        }
      }
    };

    return () => {
      delete (window as any).__selectCarWash;
      delete (window as any).__bookCarWash;
    };
  }, [locations, onLocationSelect, onBookLocation]);

  const getGoogleMapsCoords = () => {
    if (interactiveSelectCoords) {
      return { lat: interactiveSelectCoords.lat, lng: interactiveSelectCoords.lng };
    }
    if (userLat !== undefined && userLng !== undefined) {
      return { lat: userLat, lng: userLng };
    }
    if (selectedLocationId) {
      const selectedLoc = locations.find(l => l.id === selectedLocationId);
      if (selectedLoc) {
        return { lat: selectedLoc.locationLat, lng: selectedLoc.locationLng };
      }
    }
    if (locations.length > 0) {
      return { lat: locations[0].locationLat, lng: locations[0].locationLng };
    }
    return { lat: 37.7749, lng: -122.4194 };
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

      // Handle map clicks for coordinates selection
      leafletMapRef.current.on('click', (e: any) => {
        const coords = { lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) };
        if (onMapClickSelectCoords) {
          onMapClickSelectCoords(coords);
        } else if (onUserLocationChange) {
          onUserLocationChange(coords.lat, coords.lng);
        }
      });

      // Track zoom level changes for intelligent decluttering
      leafletMapRef.current.on('zoomend', () => {
        if (leafletMapRef.current) {
          setMapZoom(leafletMapRef.current.getZoom());
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

  // Sync zoom changes from state to Leaflet map
  useEffect(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.setZoom(zoom);
    }
  }, [zoom, isMaximized]);

  // Sync center movements
  useEffect(() => {
    if (leafletMapRef.current) {
      const center = getGoogleMapsCoords();
      leafletMapRef.current.setView([center.lat, center.lng], zoom);
    }
  }, [selectedLocationId, interactiveSelectCoords?.lat, interactiveSelectCoords?.lng, userLat, userLng, isMaximized]);

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
    if (onRadiusChange) {
      const userIcon = L.divIcon({
        className: 'user-marker-icon',
        html: `<div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-7 w-7 rounded-full bg-sky-400 opacity-60"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 bg-sky-600 border-2 border-white shadow-md"></span>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      leafletUserPinRef.current = L.marker([userLat, userLng], { icon: userIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(`<div class="font-sans font-bold text-xs p-1">You (Alex)</div>`);

      // Draw Radius range Circle
      leafletCircleRef.current = L.circle([userLat, userLng], {
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        radius: radiusKm * 1000
      }).addTo(leafletMapRef.current);
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

      // Handle co-located markers: If multiple locations share identical or near-identical coordinates (< 25m),
      // apply a radial offset so each business has its own distinct, clickable pin
      const coLocated = locations.filter(other => 
        Math.abs(other.locationLat - loc.locationLat) < 0.00025 &&
        Math.abs(other.locationLng - loc.locationLng) < 0.00025
      );
      let renderLat = loc.locationLat;
      let renderLng = loc.locationLng;
      if (coLocated.length > 1) {
        const indexInCluster = coLocated.findIndex(o => o.id === loc.id);
        const angle = (indexInCluster / coLocated.length) * 2 * Math.PI;
        const offsetDist = 0.00022; // ~22 meters separation
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
        // 3. When zoomed in to neighborhood level (zoom >= 14), show names unless it's a dense cluster
        // 4. When zoomed out (zoom < 14) or dense cluster (e.g. 10 at the same place), condense to compact pins
        if (isSelected || isPreviewed) {
          shouldShowName = true;
        } else if (mapZoom >= 15) {
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
          <div class="carwash-marker-pill cursor-pointer flex flex-col items-center select-none ${isSelected ? 'carwash-marker-selected z-50' : 'z-20'}" style="pointer-events: auto;">
            <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl shadow-xl border backdrop-blur-md transition-all ${
              isSelected
                ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white border-white ring-2 ring-sky-300 ring-offset-1 scale-105 shadow-sky-900/40'
                : 'bg-slate-950/92 text-white border-slate-700/80 hover:border-emerald-400 hover:bg-slate-900 shadow-black/40'
            }">
              <span class="relative flex h-2 w-2 shrink-0 items-center justify-center">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isSelected ? 'bg-amber-300' : 'bg-emerald-400'} opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${isSelected ? 'bg-amber-200' : 'bg-emerald-400'}"></span>
              </span>
              <span class="font-black text-[11px] sm:text-xs tracking-tight text-white whitespace-nowrap max-w-[100px] sm:max-w-[150px] truncate leading-none">
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
        iconSize = [220, 48];
        iconAnchor = [110, 46];
      } else {
        // Sleek compact badge with operator initials - keeps map completely uncluttered even with 10+ nearby
        markerHtml = `
          <div class="group cursor-pointer flex flex-col items-center select-none transition-transform duration-150 hover:scale-115 ${isSelected ? 'scale-115 z-50' : 'z-10'}" style="pointer-events: auto;">
            <div class="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-lg border-2 transition-all ${
              isSelected
                ? 'bg-gradient-to-br from-sky-500 to-indigo-600 border-white ring-4 ring-sky-300/60 shadow-sky-950/50 text-white'
                : 'bg-slate-900 border-emerald-400 hover:border-white shadow-black/50 text-emerald-300 hover:bg-emerald-600 hover:text-white'
            }">
              <span class="font-black text-[10px] sm:text-[11px] font-mono tracking-tight leading-none">${initials}</span>
              <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-amber-300 ring-1 ring-white' : 'bg-emerald-400 border border-slate-900'}"></span>
            </div>
            <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid ${isSelected ? '#2563eb' : '#0f172a'}; margin-top: -1px;"></div>
          </div>
        `;
        iconSize = [34, 38];
        iconAnchor = [17, 36];
      }

      const businessIcon = L.divIcon({
        className: `business-marker-container-${loc.id}`,
        html: markerHtml,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
      });

      const popupContent = `
        <div class="p-1 font-sans text-slate-900 min-w-[180px]">
          <div class="flex items-center gap-1.5 mb-1">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <strong class="text-xs text-slate-900 block font-black leading-tight">${safeName}</strong>
          </div>
          <span class="text-[10px] text-slate-500 block truncate mb-1">${safeAddress}</span>
          ${distKm ? `<span class="text-[10px] text-sky-700 font-bold block mb-1.5 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">📍 ${distKm} km away</span>` : ''}
          <div class="flex flex-wrap gap-1.5 mt-2">
            <button type="button" class="px-2.5 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg text-[10px] font-black shadow-xs flex items-center gap-1 cursor-pointer" onclick="window.__bookCarWash && window.__bookCarWash('${loc.id}')">
              📅 Book Appointment &rarr;
            </button>
            <a href="https://www.google.com/maps?q=${loc.locationLat},${loc.locationLng}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 flex items-center gap-1">
              Directions
            </a>
            ${loc.instagram ? `
              <a href="https://instagram.com/${loc.instagram}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-lg text-[10px] font-bold border border-pink-100 flex items-center gap-1">
                Instagram
              </a>
            ` : ''}
          </div>
        </div>
      `;

      const m = L.marker([renderLat, renderLng], { icon: businessIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(popupContent);

      m.on('click', () => {
        setPreviewLocation(loc);
        if (onLocationSelect) {
          onLocationSelect(loc);
        }
        if (leafletMapRef.current) {
          leafletMapRef.current.panTo([loc.locationLat, loc.locationLng]);
        }
      });

      leafletMarkersRef.current.push(m);
    });

  }, [leafletLoaded, locations, selectedLocationId, userLat, userLng, radiusKm, interactiveSelectCoords, isMaximized, markerDisplayMode, mapZoom, previewLocation]);

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

  const presetsByCountry = activePresets.reduce<Record<string, MapPreset[]>>((acc, preset) => {
    const c = preset.country || 'Brunei';
    if (!acc[c]) acc[c] = [];
    acc[c].push(preset);
    return acc;
  }, {});

  const handlePresetSelect = (preset: MapPreset) => {
    if (onUserLocationChange) {
      onUserLocationChange(preset.lat, preset.lng);
    } else if (onMapClickSelectCoords) {
      onMapClickSelectCoords({ lat: preset.lat, lng: preset.lng });
    }
  };

  const element = (
    <div className={`flex flex-col bg-slate-50 rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs h-full min-h-[250px] ${
      isMaximized ? 'fixed inset-4 bg-white z-[100] border-slate-300 shadow-2xl m-auto max-w-6xl max-h-[85vh]' : 'w-full'
    }`} id="interactive-map-root">
      
      {/* Map Search & Preset Header Block */}
      {!compact && (
        <div className="mb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
              <Navigation className="h-4 w-4 text-sky-600 animate-pulse" />
              Interactive Map Integration
            </h4>
            <p className="text-[10px] text-slate-500">Real-time OpenStreetMap Layers powered by Leaflet & external Google Maps</p>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
            {Object.keys(presetsByCountry).map((country) => (
              <div key={country} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 text-[10px] font-medium text-slate-600">
                <span className="font-bold text-slate-400 px-1 uppercase text-[8px] tracking-wider border-r border-slate-200/80 mr-0.5">{country}</span>
                {presetsByCountry[country].map((pre) => (
                  <button
                    key={pre.id}
                    type="button"
                    onClick={() => handlePresetSelect(pre)}
                    className="px-1.5 py-0.5 hover:bg-white hover:text-sky-600 hover:shadow-2xs rounded border border-transparent transition-all cursor-pointer"
                  >
                    {pre.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Search Bar Input */}
      <div className={`relative ${compact ? 'mb-2' : 'mb-4'}`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search Brunei (e.g. Gadong BE1118, Kiulap, KB) or enter coordinates..."
                className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-500"
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
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs shrink-0"
            >
              Search
            </button>
          </div>

          {/* Search suggestions dropdown list */}
          {showSuggestions && searchQuery.trim() !== '' && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-56 overflow-y-auto">
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

      {/* Radius adjustment slider (Only on customer view) */}
      {onRadiusChange && (
        <div className="mb-4 bg-sky-50/80 border border-sky-100/50 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-600 shrink-0" />
              <span className="text-xs font-semibold text-sky-900">
                Filter Radius: <strong className="font-bold text-sky-700">{radiusKm} km</strong>
              </span>
            </div>
            {/* Quick 1km / 3km / 5km / 10km / 25km chips */}
            <div className="flex items-center gap-1 flex-wrap">
              {[1, 3, 5, 10, 25].map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => onRadiusChange(dist)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                    radiusKm === dist
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-sky-800 border border-sky-200 hover:border-sky-300'
                  }`}
                  title={`Filter to ${dist} km`}
                >
                  {dist}km
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-500 shrink-0">1km</span>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => onRadiusChange(parseInt(e.target.value))}
              className="w-full sm:w-36 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              id="map-radius-slider"
            />
            <span className="text-[10px] font-bold text-slate-500 shrink-0">25km</span>
          </div>
        </div>
      )}

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
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-auto sm:bottom-3 sm:left-3 sm:right-auto sm:max-w-xs bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl z-30 animate-fade-in text-white pointer-events-auto">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm font-black text-xs">
                  {previewLocation.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-xs sm:text-sm text-white truncate">
                      {previewLocation.name}
                    </h4>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0">
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="truncate">{previewLocation.address}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLocation(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng) && (
              <div className="text-[10px] text-slate-300 font-medium mb-2 flex items-center justify-between bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <span className="text-sky-300 font-bold flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-sky-400" />
                  Distance:
                </span>
                <span className="font-bold text-white font-mono">
                  {computeDistanceKm(userLat, userLng, previewLocation.locationLat, previewLocation.locationLng).toFixed(1)} km away
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-0.5">
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
                  className="flex-1 py-2 px-3.5 bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow-md hover:shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Appointment</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <a
                href={`https://www.google.com/maps?q=${previewLocation.locationLat},${previewLocation.locationLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Open GPS Navigation in Google Maps"
              >
                <ExternalLink className="w-4 h-4 text-rose-400" />
              </a>

              {previewLocation.instagram && (
                <a
                  href={`https://instagram.com/${previewLocation.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-pink-400 border border-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Open Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Floating Map Controls overlay */}
        <div className="absolute bottom-3 right-3 flex flex-row items-center gap-1 border border-slate-200/60 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-md z-20 pointer-events-auto">
          {/* Toggle Pin Display Mode: Smart (Auto) / All Names / Minimal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMarkerDisplayMode((prev) => {
                if (prev === 'smart') return 'all';
                if (prev === 'all') return 'dots';
                return 'smart';
              });
            }}
            className={`px-2 py-1.5 border rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs font-bold ${
              markerDisplayMode === 'smart'
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : markerDisplayMode === 'all'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-500'
            }`}
            title={
              markerDisplayMode === 'smart'
                ? 'Smart Mode: Declutters map automatically when zoomed out, expands selected & street views'
                : markerDisplayMode === 'all'
                ? 'All Names Mode: Always displays operator names for all car washes'
                : 'Minimal Mode: Compact pin dots only'
            }
          >
            <Tag className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px] font-extrabold whitespace-nowrap">
              {markerDisplayMode === 'smart' ? 'Pins: Smart' : markerDisplayMode === 'all' ? 'Pins: All' : 'Pins: Minimal'}
            </span>
          </button>

          {/* External Google Maps Link */}
          <a
            href={`https://www.google.com/maps?q=${currentCenter.lat},${currentCenter.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 rounded-lg shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Open real coordinates on Google Maps"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Toggle Fullscreen / Maximize */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMaximized(!isMaximized);
            }}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-700 rounded-lg shadow-md transition-all flex items-center justify-center cursor-pointer"
            title={isMaximized ? "Minimize Map" : "Maximize Map"}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom(Math.min(18, zoom + 1));
            }}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoom(Math.max(10, zoom - 1));
            }}
            className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-md transition-all flex items-center justify-center cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Coordinate Info readout bottom bar */}
      {!compact && (
        <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 mt-4 text-[11px] font-mono text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Center Ref: {currentCenter.lat.toFixed(4)}°N, {currentCenter.lng.toFixed(4)}°W</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">
              Total Grid Pins Loaded:{' '}
              <strong className="text-slate-700 font-sans font-bold">
                {locations.length} active
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (isMaximized && mounted) {
    return createPortal(element, document.body);
  }

  return element;
};
