import React, { useState } from 'react';
import { Restaurant, FloorZone, RestaurantTable } from '../../types';
import { useRestaurants } from '../../context/RestaurantContext';
import { 
  LayoutGrid, 
  Plus, 
  Trash2, 
  Edit3, 
  MoveRight, 
  Users, 
  Check, 
  X, 
  Settings2, 
  Layers, 
  Sparkles, 
  Link2, 
  Unlink, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface FloorPlanConfiguratorProps {
  restaurant: Restaurant;
  onClose?: () => void;
  userRole?: 'OWNER' | 'EMPLOYEE';
}

export const FloorPlanConfigurator: React.FC<FloorPlanConfiguratorProps> = ({
  restaurant,
  onClose,
  userRole = 'EMPLOYEE'
}) => {
  const { 
    addTable, 
    updateTable, 
    deleteTable, 
    addFloorZone, 
    updateFloorZone, 
    deleteFloorZone, 
    mergeTables, 
    unmergeTable 
  } = useRestaurants();

  const zones: FloorZone[] = restaurant.floorZones || [
    { id: 'zone_main', name: 'Main Dining Hall', description: 'Central indoor dining area', color: 'emerald' },
    { id: 'zone_patio', name: 'Outdoor Patio / Alfresco', description: 'Covered outdoor dining', color: 'amber' },
    { id: 'zone_vip', name: 'VIP Private Room', description: 'Private dining room for bookings', color: 'purple' },
  ];

  const tables: RestaurantTable[] = restaurant.tables || [];

  const [activeTab, setActiveTab] = useState<'TABLES' | 'ZONES' | 'MERGE'>('TABLES');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');

  // New Table Form State
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [tableName, setTableName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [tableZoneId, setTableZoneId] = useState<string>(zones[0]?.id || 'zone_main');
  const [tableCapacity, setTableCapacity] = useState<number>(4);
  const [tableShape, setTableShape] = useState<'RECTANGLE' | 'ROUND' | 'BOOTH'>('RECTANGLE');
  const [tableNotes, setTableNotes] = useState('');

  // Edit Table State
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);

  // New Zone Form State
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [zoneName, setZoneName] = useState('');
  const [zoneDesc, setZoneDesc] = useState('');
  const [zoneColor, setZoneColor] = useState<string>('emerald');
  const [editingZone, setEditingZone] = useState<FloorZone | null>(null);

  // Merge Tables State
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergedPartyLabel, setMergedPartyLabel] = useState('');

  const handleCreateNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim() || !tableNumber.trim()) return;

    addTable(restaurant.id, {
      restaurantId: restaurant.id,
      name: tableName.trim(),
      tableNumber: tableNumber.trim().toUpperCase(),
      zoneId: tableZoneId,
      capacity: Number(tableCapacity) || 4,
      shape: tableShape,
      isActive: true,
      notes: tableNotes.trim() || undefined,
    });

    setTableName('');
    setTableNumber('');
    setTableNotes('');
    setShowAddTableModal(false);
  };

  const handleSaveEditTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;

    updateTable(restaurant.id, editingTable.id, {
      name: editingTable.name,
      tableNumber: editingTable.tableNumber,
      zoneId: editingTable.zoneId,
      capacity: editingTable.capacity,
      shape: editingTable.shape,
      notes: editingTable.notes,
    });

    setEditingTable(null);
  };

  const handleCreateOrUpdateZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingZone) {
      updateFloorZone(restaurant.id, editingZone.id, {
        name: editingZone.name,
        description: editingZone.description,
        color: editingZone.color,
      });
      setEditingZone(null);
    } else {
      if (!zoneName.trim()) return;
      addFloorZone(restaurant.id, {
        name: zoneName.trim(),
        description: zoneDesc.trim(),
        color: zoneColor,
      });
      setZoneName('');
      setZoneDesc('');
      setShowAddZoneModal(false);
    }
  };

  const handleMergeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedForMerge.length < 2) {
      alert('Please select at least 2 tables to merge.');
      return;
    }
    const label = mergedPartyLabel.trim() || `Party of ${selectedForMerge.length}`;
    mergeTables(restaurant.id, selectedForMerge, label);
    setSelectedForMerge([]);
    setMergedPartyLabel('');
    setActiveTab('TABLES');
  };

  const filteredTables = tables.filter(t => {
    if (selectedZoneFilter === 'ALL') return true;
    return t.zoneId === selectedZoneFilter;
  });

  const getZoneBadgeColor = (color?: string) => {
    switch (color) {
      case 'amber': return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'purple': return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'blue': return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'orange': return 'bg-orange-100 text-orange-900 border-orange-300';
      default: return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#D9E2D9] shadow-md p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9E2D9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-[#247545]" />
            <h2 className="text-lg font-black text-[#132218] font-display">
              Flexible Floor Plan & Table Layout Manager
            </h2>
          </div>
          <p className="text-xs text-[#4F6155] mt-1">
            Easily add, rearrange, or remove physical dining tables and customize floor areas (e.g. Indoor, Alfresco, VIP Suite, Family Hall).
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#4F6155] hover:bg-[#F5F7F4] hover:text-[#132218] transition-all self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Sub-Nav Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('TABLES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'TABLES'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Tables ({tables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ZONES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'ZONES'
              ? 'bg-[#132218] text-white shadow-xs'
              : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#DE5124]" />
          <span>Floor Areas / Zones ({zones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MERGE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'MERGE'
              ? 'bg-[#247545] text-white shadow-xs'
              : 'bg-[#F5F7F4] text-[#4F6155] hover:text-[#132218]'
          }`}
        >
          <Link2 className="w-4 h-4 text-inherit" />
          <span>Combine / Merge Tables</span>
        </button>
      </div>

      {/* TAB 1: TABLES */}
      {activeTab === 'TABLES' && (
        <div className="space-y-4">
          {/* Action Bar & Zone Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F7F4] p-3 rounded-2xl">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-[11px] font-bold text-[#4F6155] uppercase tracking-wider ml-1">Area:</span>
              <button
                onClick={() => setSelectedZoneFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedZoneFilter === 'ALL'
                    ? 'bg-white text-[#132218] shadow-xs'
                    : 'text-[#4F6155] hover:text-[#132218]'
                }`}
              >
                All ({tables.length})
              </button>
              {zones.map(z => {
                const count = tables.filter(t => t.zoneId === z.id).length;
                return (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneFilter(z.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedZoneFilter === z.id
                        ? 'bg-white text-[#132218] shadow-xs'
                        : 'text-[#4F6155] hover:text-[#132218]'
                    }`}
                  >
                    {z.name} ({count})
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowAddTableModal(true)}
              className="px-4 py-2 bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all ml-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          </div>

          {/* Table Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTables.map(tbl => {
              const zone = zones.find(z => z.id === tbl.zoneId);
              const isMerged = tbl.mergedWith && tbl.mergedWith.length > 0;

              return (
                <div
                  key={tbl.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isMerged 
                      ? 'bg-amber-50/70 border-amber-300' 
                      : 'bg-white border-[#D9E2D9] hover:border-[#132218]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-extrabold text-sm text-[#132218]">{tbl.name}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F5F7F4] text-[#4F6155] font-bold">
                          QR: #{tbl.tableNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getZoneBadgeColor(zone?.color)}`}>
                          {zone?.name || 'General Area'}
                        </span>
                        <span className="text-[11px] font-medium text-[#4F6155] flex items-center gap-1">
                          <Users className="w-3 h-3 text-[#247545]" />
                          {tbl.capacity} Pax
                        </span>
                        <span className="text-[10px] font-semibold text-[#8B9E90] uppercase">
                          {tbl.shape || 'RECT'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingTable(tbl)}
                        title="Edit or Move Table"
                        className="p-1.5 text-[#4F6155] hover:text-[#132218] hover:bg-[#F5F7F4] rounded-lg transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${tbl.name}? This will remove it from the floor layout and POS.`)) {
                            deleteTable(restaurant.id, tbl.id);
                          }
                        }}
                        title="Remove Table"
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {tbl.notes && (
                    <p className="text-[11px] text-[#4F6155] italic mt-2 bg-[#F5F7F4] p-1.5 rounded-lg">
                      "{tbl.notes}"
                    </p>
                  )}

                  {/* Move quick action */}
                  <div className="mt-3 pt-2.5 border-t border-[#EDF2ED] flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#4F6155] font-semibold">Move to:</span>
                    <select
                      value={tbl.zoneId}
                      onChange={(e) => updateTable(restaurant.id, tbl.id, { zoneId: e.target.value })}
                      className="text-[11px] font-bold bg-[#F5F7F4] border border-[#D9E2D9] rounded-lg px-2 py-1 text-[#132218] cursor-pointer"
                    >
                      {zones.map(z => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>

                  {isMerged && (
                    <div className="mt-2 flex items-center justify-between bg-amber-100 text-amber-900 px-2.5 py-1.5 rounded-xl text-[11px] font-bold">
                      <span className="flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-amber-700" />
                        Merged for Group Party
                      </span>
                      <button
                        onClick={() => unmergeTable(restaurant.id, tbl.id)}
                        className="text-red-700 underline text-[10px] cursor-pointer hover:text-red-900"
                      >
                        Separate
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTables.length === 0 && (
              <div className="col-span-full py-10 text-center bg-[#F5F7F4] rounded-2xl text-xs text-[#4F6155]">
                No tables configured in this floor area yet. Click <strong>"Add Table"</strong> above to add one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ZONES / FLOOR AREAS */}
      {activeTab === 'ZONES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#4F6155]">
              Customize your floor areas, dining halls, or outdoor zones according to your restaurant's exact architecture.
            </p>
            <button
              onClick={() => {
                setEditingZone(null);
                setZoneName('');
                setZoneDesc('');
                setZoneColor('emerald');
                setShowAddZoneModal(true);
              }}
              className="px-4 py-2 bg-[#247545] hover:bg-[#1E6038] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Floor Area</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {zones.map(z => {
              const count = tables.filter(t => t.zoneId === z.id).length;
              return (
                <div key={z.id} className="p-4 rounded-2xl border border-[#D9E2D9] bg-white space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        z.color === 'amber' ? 'bg-amber-500' :
                        z.color === 'purple' ? 'bg-purple-500' :
                        z.color === 'blue' ? 'bg-blue-500' :
                        z.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                      }`} />
                      <h4 className="font-extrabold text-sm text-[#132218]">{z.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingZone(z);
                          setShowAddZoneModal(true);
                        }}
                        className="p-1 text-[#4F6155] hover:text-[#132218] rounded-md transition-all cursor-pointer"
                        title="Edit Area Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (count > 0) {
                            alert(`Cannot delete '${z.name}' because it contains ${count} tables. Please move or delete the tables first.`);
                            return;
                          }
                          if (confirm(`Delete '${z.name}'?`)) {
                            deleteFloorZone(restaurant.id, z.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:text-red-700 rounded-md transition-all cursor-pointer"
                        title="Delete Area"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4F6155]">{z.description || 'No description provided.'}</p>
                  
                  <div className="pt-2 border-t border-[#EDF2ED] flex items-center justify-between text-[11px] text-[#4F6155]">
                    <span>Assigned Tables: <strong>{count} tables</strong></span>
                    <span className="font-mono text-[10px] text-[#8B9E90]">ID: {z.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COMBINE / MERGE TABLES */}
      {activeTab === 'MERGE' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1">
            <h4 className="font-bold flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-700" />
              Combine Tables for Large Groups & Kenduri / Family Gatherings
            </h4>
            <p>
              When a large group dines together, staff often push two or more tables together. Select the tables below to link them into a single party ticket. Waiters and the kitchen will see the combined table automatically.
            </p>
          </div>

          <form onSubmit={handleMergeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#132218] mb-1.5">
                Group / Party Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Haji Razak Family (12 Pax), Birthday Party, Shell Brunei Meeting..."
                value={mergedPartyLabel}
                onChange={(e) => setMergedPartyLabel(e.target.value)}
                className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-medium text-[#132218] focus:outline-none focus:border-[#247545]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#132218] mb-1.5">
                Select Tables to Combine:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tables.map(tbl => {
                  const isSelected = selectedForMerge.includes(tbl.id);
                  const isAlreadyMerged = tbl.mergedWith && tbl.mergedWith.length > 0;

                  return (
                    <button
                      type="button"
                      key={tbl.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedForMerge(selectedForMerge.filter(id => id !== tbl.id));
                        } else {
                          setSelectedForMerge([...selectedForMerge, tbl.id]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                        isSelected
                          ? 'bg-[#247545] text-white border-[#247545] shadow-xs'
                          : isAlreadyMerged
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-[#F5F7F4] text-[#132218] border-[#D9E2D9] hover:border-[#132218]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{tbl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[10px] opacity-80">{tbl.capacity} Pax</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={selectedForMerge.length < 2}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all ${
                  selectedForMerge.length >= 2
                    ? 'bg-[#247545] hover:bg-[#1E6038] text-white shadow-xs'
                    : 'bg-[#D9E2D9] text-[#8B9E90] cursor-not-allowed'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Link {selectedForMerge.length} Tables Together</span>
              </button>
              {selectedForMerge.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedForMerge([])}
                  className="text-xs text-[#4F6155] hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Table */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#D9E2D9] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E2D9] pb-3">
              <h3 className="font-extrabold text-base text-[#132218]">Add New Table to Floor Plan</h3>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="text-[#4F6155] hover:text-[#132218] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Table Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 9, Patio 3, VIP 2, Balcony 1"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218] focus:outline-none focus:border-[#247545]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    QR Table # (Short Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9, P3, V2"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#132218] focus:outline-none focus:border-[#247545]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    Seating Capacity (Pax)
                  </label>
                  <select
                    value={tableCapacity}
                    onChange={(e) => setTableCapacity(Number(e.target.value))}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218] focus:outline-none focus:border-[#247545] cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map(n => (
                      <option key={n} value={n}>{n} Guests</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    Floor Area / Zone
                  </label>
                  <select
                    value={tableZoneId}
                    onChange={(e) => setTableZoneId(e.target.value)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218] focus:outline-none focus:border-[#247545] cursor-pointer"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    Table Shape
                  </label>
                  <select
                    value={tableShape}
                    onChange={(e) => setTableShape(e.target.value as any)}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218] focus:outline-none focus:border-[#247545] cursor-pointer"
                  >
                    <option value="RECTANGLE">Rectangle (Standard)</option>
                    <option value="ROUND">Round</option>
                    <option value="BOOTH">Booth / Banquette</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Location Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near kitchen pass, window view, quiet corner..."
                  value={tableNotes}
                  onChange={(e) => setTableNotes(e.target.value)}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:outline-none focus:border-[#247545]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2D9]">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155] hover:bg-[#F5F7F4] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#247545] hover:bg-[#1E6038] text-white shadow-xs cursor-pointer"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Table */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#D9E2D9] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E2D9] pb-3">
              <h3 className="font-extrabold text-base text-[#132218]">Edit Table: {editingTable.name}</h3>
              <button
                onClick={() => setEditingTable(null)}
                className="text-[#4F6155] hover:text-[#132218] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Table Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editingTable.name}
                  onChange={(e) => setEditingTable({ ...editingTable, name: e.target.value })}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    QR Table # (Short Code)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTable.tableNumber}
                    onChange={(e) => setEditingTable({ ...editingTable, tableNumber: e.target.value })}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#132218]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#132218] mb-1">
                    Capacity (Pax)
                  </label>
                  <select
                    value={editingTable.capacity}
                    onChange={(e) => setEditingTable({ ...editingTable, capacity: Number(e.target.value) })}
                    className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map(n => (
                      <option key={n} value={n}>{n} Guests</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Floor Area / Zone (Move Table)
                </label>
                <select
                  value={editingTable.zoneId}
                  onChange={(e) => setEditingTable({ ...editingTable, zoneId: e.target.value })}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218]"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={editingTable.notes || ''}
                  onChange={(e) => setEditingTable({ ...editingTable, notes: e.target.value })}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2D9]">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#247545] hover:bg-[#1E6038] text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Floor Area / Zone */}
      {showAddZoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#D9E2D9] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D9E2D9] pb-3">
              <h3 className="font-extrabold text-base text-[#132218]">
                {editingZone ? 'Edit Floor Area' : 'Add New Floor Area / Zone'}
              </h3>
              <button
                onClick={() => setShowAddZoneModal(false)}
                className="text-[#4F6155] hover:text-[#132218] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateZone} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Area Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor, Verandah, Private VIP Suite, Smoking Terrace"
                  value={editingZone ? editingZone.name : zoneName}
                  onChange={(e) => {
                    if (editingZone) setEditingZone({ ...editingZone, name: e.target.value });
                    else setZoneName(e.target.value);
                  }}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs font-bold text-[#132218]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Air-conditioned indoor dining, overlooks garden..."
                  value={editingZone ? (editingZone.description || '') : zoneDesc}
                  onChange={(e) => {
                    if (editingZone) setEditingZone({ ...editingZone, description: e.target.value });
                    else setZoneDesc(e.target.value);
                  }}
                  className="w-full bg-[#F5F7F4] border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#132218] mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-3">
                  {[
                    { id: 'emerald', bg: 'bg-emerald-500' },
                    { id: 'amber', bg: 'bg-amber-500' },
                    { id: 'purple', bg: 'bg-purple-500' },
                    { id: 'blue', bg: 'bg-blue-500' },
                    { id: 'orange', bg: 'bg-orange-500' },
                  ].map(c => {
                    const isSelected = editingZone ? editingZone.color === c.id : zoneColor === c.id;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          if (editingZone) setEditingZone({ ...editingZone, color: c.id });
                          else setZoneColor(c.id);
                        }}
                        className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center cursor-pointer transition-all ${
                          isSelected ? 'ring-2 ring-offset-2 ring-[#132218] scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D9E2D9]">
                <button
                  type="button"
                  onClick={() => setShowAddZoneModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#4F6155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-[#247545] hover:bg-[#1E6038] text-white shadow-xs"
                >
                  {editingZone ? 'Update Area' : 'Create Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
