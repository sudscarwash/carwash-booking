/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Navigation, ZoomIn, ZoomOut, Sliders, Search, X, Maximize2, Minimize2, ExternalLink } from 'lucide-react';
import { CarWash, MapPreset } from '../types.js';

interface MapSimulationProps {
  locations: CarWash[];
  selectedLocationId?: string;
  onLocationSelect?: (loc: CarWash) => void;
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
  interactiveSelectCoords,
  onMapClickSelectCoords,
  userLat = 37.7749,
  userLng = -122.4194,
  radiusKm = 10,
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
        const coords = { lat: parseFloat(e.latlng.lat.toFixed(4)), lng: parseFloat(e.latlng.lng.toFixed(4)) };
        if (onMapClickSelectCoords) {
          onMapClickSelectCoords(coords);
        } else if (onUserLocationChange) {
          onUserLocationChange(coords.lat, coords.lng);
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

    // 3. Draw Locations Pins
    locations.forEach((loc) => {
      const isSelected = selectedLocationId === loc.id;
      const markerHtml = `<div class="relative flex flex-col items-center">
        <div class="w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-transform ${
          isSelected ? 'bg-sky-600 text-white scale-110 ring-4 ring-sky-100' : 'bg-emerald-600 text-white hover:bg-emerald-500'
        }">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>`;

      const businessIcon = L.divIcon({
        className: `business-marker-container-${loc.id}`,
        html: markerHtml,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const popupContent = `
        <div class="p-1 font-sans">
          <strong class="text-xs text-slate-800 block">${loc.name}</strong>
          <span class="text-[10px] text-slate-500 block truncate mb-1.5">${loc.address}</span>
          <div class="flex gap-1.5 mt-1.5">
            <a href="https://www.google.com/maps?q=${loc.locationLat},${loc.locationLng}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-bold border border-rose-100 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
              Google Maps
            </a>
            ${loc.instagram ? `
              <a href="https://instagram.com/${loc.instagram}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded text-[10px] font-bold border border-pink-100 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                Instagram
              </a>
            ` : ''}
          </div>
        </div>
      `;

      const m = L.marker([loc.locationLat, loc.locationLng], { icon: businessIcon })
        .addTo(leafletMapRef.current)
        .bindPopup(popupContent);

      m.on('click', () => {
        if (onLocationSelect) {
          onLocationSelect(loc);
        }
      });

      leafletMarkersRef.current.push(m);
    });

  }, [leafletLoaded, locations, selectedLocationId, userLat, userLng, radiusKm, interactiveSelectCoords, isMaximized]);

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
    <div className={`flex flex-col bg-slate-50 rounded-2xl border border-slate-200/80 p-4 shadow-xs h-full min-h-[400px] ${
      isMaximized ? 'fixed inset-4 bg-white z-[100] border-slate-300 shadow-2xl m-auto max-w-6xl max-h-[85vh]' : 'w-full'
    }`} id="interactive-map-root">
      
      {/* Map Search & Preset Header Block */}
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

        {/* Search Bar Input */}
        <div className="relative">
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
      </div>

      {/* Radius adjustment slider (Only on customer view) */}
      {onRadiusChange && (
        <div className="mb-4 bg-sky-50/80 border border-sky-100/50 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-semibold text-sky-900">
              Filtering Radius Distance: <strong className="font-bold text-sky-700">{radiusKm} km</strong>
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="25"
            step="1"
            value={radiusKm}
            onChange={(e) => onRadiusChange(parseInt(e.target.value))}
            className="w-full sm:w-48 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            id="map-radius-slider"
          />
        </div>
      )}

      {/* Real Leaflet Map Canvas */}
      <div className="relative flex-1 rounded-xl bg-slate-100/80 border border-slate-200 overflow-hidden h-[450px] md:h-auto">
        {!leafletLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-2">
            <div className="animate-spin h-6 w-6 border-2 border-sky-500 border-t-transparent rounded-full"></div>
            <span className="text-xs text-slate-400 font-medium">Loading interactive map layers...</span>
          </div>
        ) : (
          <div ref={leafletContainerRef} className="w-full h-full z-10" />
        )}

        {/* Floating Map Controls overlay */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20 pointer-events-auto">
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

        {/* HUD Overlay Helper Details */}
        <div className="absolute top-3 left-3 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-medium flex items-center gap-1.5 shadow-md z-20">
          <Navigation className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
          <span>Interactive Leaflet Map Active • OpenStreetMap Layers</span>
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
