import React, { useState } from 'react';
import { BRUNEI_DISTRICTS, STANDARD_DISTRICT_ROUTES, getDistrictRoute, BruneiDistrict } from '../../utils/districtRates';
import { Compass, ShieldCheck, ArrowRight, TrendingUp, Info, Check, Car } from 'lucide-react';

interface BruneiDistrictMatrixGridProps {
  canEditRates?: boolean;
  onSelectRoute?: (origin: string, destination: string) => void;
  className?: string;
}

export const BruneiDistrictMatrixGrid: React.FC<BruneiDistrictMatrixGridProps> = ({
  canEditRates = false,
  onSelectRoute,
  className = '',
}) => {
  const [selectedOrigin, setSelectedOrigin] = useState<BruneiDistrict>('Belait');
  const [selectedDest, setSelectedDest] = useState<BruneiDistrict>('Brunei-Muara');

  const selectedRouteInfo = getDistrictRoute(selectedOrigin, selectedDest);

  const handleCellClick = (origin: BruneiDistrict, dest: BruneiDistrict) => {
    setSelectedOrigin(origin);
    setSelectedDest(dest);
    if (onSelectRoute) {
      onSelectRoute(origin, dest);
    }
  };

  return (
    <div className={`bg-white rounded-3xl border border-[#D9E2D9] p-5 sm:p-7 shadow-xs space-y-6 ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#D9E2D9]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#247545] text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#132218] font-display">
                Brunei 4-District Dispatch & Distance Pricing Grid (4×4 Matrix)
              </h3>
              <p className="text-xs text-[#4F6155] mt-0.5">
                Exact route pricing between restaurants (Origin) and customers (Destination) across all 4 districts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Local District
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span> Cross-District Highway
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span> SHOAS Bridge Crossing
          </span>
        </div>
      </div>

      {/* Interactive Quick Route Calculator / Selector */}
      <div className="p-4 bg-gradient-to-r from-[#F5F7F4] to-[#EBF0EB] rounded-2xl border border-[#D9E2D9] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#4F6155] uppercase tracking-wider">Origin (Kitchen):</span>
              <select
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value as BruneiDistrict)}
                className="bg-white border border-[#D9E2D9] rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#132218] shadow-2xs focus:ring-2 focus:ring-[#247545] cursor-pointer"
              >
                {BRUNEI_DISTRICTS.map((d) => (
                  <option key={`origin-${d}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight className="w-4 h-4 text-[#7A8E80] hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#4F6155] uppercase tracking-wider">Destination (Customer):</span>
              <select
                value={selectedDest}
                onChange={(e) => setSelectedDest(e.target.value as BruneiDistrict)}
                className="bg-white border border-[#D9E2D9] rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#132218] shadow-2xs focus:ring-2 focus:ring-[#247545] cursor-pointer"
              >
                {BRUNEI_DISTRICTS.map((d) => (
                  <option key={`dest-${d}`} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[11px] text-[#4F6155]">Calculated Route:</span>
            <span className="font-mono font-extrabold text-base text-[#247545] bg-white px-3 py-1 rounded-xl border border-[#D9E2D9] shadow-2xs">
              ${selectedRouteInfo.defaultFee.toFixed(2)} BND
            </span>
          </div>
        </div>

        {/* Selected Route Detailed Summary Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-stone-200/60 text-xs">
          <div>
            <span className="text-[10px] text-[#7A8E80] block font-semibold">Route Type</span>
            <span className="font-bold text-[#132218]">
              {selectedOrigin === selectedDest ? 'Local Intra-District' : 'Cross-District Highway'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#7A8E80] block font-semibold">Road Distance</span>
            <span className="font-mono font-bold text-[#132218]">~{selectedRouteInfo.distanceKm} km</span>
          </div>
          <div>
            <span className="text-[10px] text-[#7A8E80] block font-semibold">Est. Transit Time</span>
            <span className="font-bold text-[#132218]">{selectedRouteInfo.estimatedMinutes}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#7A8E80] block font-semibold">Anti-Gouging Cap</span>
            <span className="font-mono font-bold text-[#DE5124]">
              Max ${selectedRouteInfo.maxCeilingFee ? selectedRouteInfo.maxCeilingFee.toFixed(2) : (selectedRouteInfo.defaultFee * 1.5).toFixed(2)} BND
            </span>
          </div>
        </div>
      </div>

      {/* The 4x4 Grid Matrix Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-[#132218] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#247545]" />
            Complete 4×4 District Dispatch Rate Matrix
          </span>
          <span className="text-[11px] text-[#7A8E80]">Click any route cell to inspect details</span>
        </div>

        <div className="overflow-x-auto border border-[#D9E2D9] rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[620px]">
            <thead>
              <tr className="bg-[#132218] text-white">
                <th className="p-3 font-bold border-r border-stone-700 w-44">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Origin ↓ \ Destination →</div>
                  <div className="text-xs font-extrabold text-[#E0F2E6]">Where Food Is Made</div>
                </th>
                {BRUNEI_DISTRICTS.map((dest) => (
                  <th key={`head-${dest}`} className="p-3 font-extrabold text-center border-r border-stone-700/60 last:border-r-0">
                    <div className="text-xs">{dest}</div>
                    <div className="text-[9px] text-stone-400 font-normal">Customer District</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {BRUNEI_DISTRICTS.map((origin) => (
                <tr key={`row-${origin}`} className="hover:bg-stone-50/50 transition-colors">
                  {/* Row Header (Origin) */}
                  <td className="p-3 font-extrabold bg-[#F5F7F4] text-[#132218] border-r border-[#D9E2D9]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#247545]"></span>
                      <span>{origin}</span>
                    </div>
                  </td>

                  {/* Matrix Cells */}
                  {BRUNEI_DISTRICTS.map((dest) => {
                    const routeKey = `${origin}->${dest}`;
                    const route = STANDARD_DISTRICT_ROUTES[routeKey] || getDistrictRoute(origin, dest);
                    const isSelected = selectedOrigin === origin && selectedDest === dest;
                    const isLocal = origin === dest;
                    const isBridge = (origin === 'Temburong' || dest === 'Temburong') && origin !== dest;

                    return (
                      <td
                        key={`cell-${origin}-${dest}`}
                        onClick={() => handleCellClick(origin, dest)}
                        className={`p-3 text-center cursor-pointer transition-all border-r border-stone-200 last:border-r-0 relative ${
                          isSelected
                            ? 'bg-[#E0F2E6] ring-2 ring-[#247545] z-10'
                            : isLocal
                            ? 'bg-emerald-50/40 hover:bg-emerald-100/50'
                            : isBridge
                            ? 'bg-purple-50/30 hover:bg-purple-100/40'
                            : 'bg-white hover:bg-amber-50/40'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#247545]"></span>
                        )}

                        <div className="font-mono font-extrabold text-sm text-[#132218]">
                          ${route.defaultFee.toFixed(2)}
                          <span className="text-[10px] text-[#7A8E80] font-normal ml-0.5">BND</span>
                        </div>

                        <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px]">
                          <span className="text-[#7A8E80] font-mono">{route.distanceKm}km</span>
                          <span className="text-stone-300">•</span>
                          <span className={isLocal ? 'text-[#247545] font-bold' : 'text-[#DE5124] font-semibold'}>
                            {isLocal ? 'Local' : `Cap $${route.maxCeilingFee ? route.maxCeilingFee : (route.defaultFee * 1.5).toFixed(0)}`}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Examples & Clarifications Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Example 1: Belait to Belait */}
        <div 
          onClick={() => handleCellClick('Belait', 'Belait')}
          className="p-3.5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-1.5 cursor-pointer hover:border-[#247545] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#132218]">Belait ➔ Belait (Local)</span>
            <span className="font-mono font-bold text-[#247545]">$5.00 BND</span>
          </div>
          <p className="text-[11px] text-[#4F6155] leading-relaxed">
            Kuala Belait, Seria, or Lumut to Belait. Standard intra-district local flat fee (15 km, 20–35 mins).
          </p>
        </div>

        {/* Example 2: Muara to Muara */}
        <div 
          onClick={() => handleCellClick('Brunei-Muara', 'Brunei-Muara')}
          className="p-3.5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-1.5 cursor-pointer hover:border-[#247545] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#132218]">Muara ➔ Muara (Local)</span>
            <span className="font-mono font-bold text-[#247545]">$3.50 BND</span>
          </div>
          <p className="text-[11px] text-[#4F6155] leading-relaxed">
            Bandar, Kiulap, Gadong, Berakas, Jerudong. Capital district local delivery flat rate (12 km, 20–35 mins).
          </p>
        </div>

        {/* Example 3: Belait to Muara / Muara to Belait */}
        <div 
          onClick={() => handleCellClick('Belait', 'Brunei-Muara')}
          className="p-3.5 bg-[#F9FAF8] rounded-2xl border border-[#D9E2D9] space-y-1.5 cursor-pointer hover:border-[#DE5124] transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#132218]">Belait ⇄ Muara (Long Haul)</span>
            <span className="font-mono font-bold text-[#DE5124]">$16.00 BND</span>
          </div>
          <p className="text-[11px] text-[#4F6155] leading-relaxed">
            108 km coastal highway. Hard anti-gouging cap of <strong>$22.00 BND</strong> prevents courier price extortion.
          </p>
        </div>
      </div>
    </div>
  );
};
