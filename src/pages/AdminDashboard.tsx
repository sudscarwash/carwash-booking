/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { MapSimulation } from '../components/MapSimulation.js';
import {
  ShieldAlert, ShieldCheck, Users, Activity, Sliders, Check, X,
  Plus, Edit, UserPlus, FileText, Ban, CheckCircle, Info, Lock, Key, Sparkles, MapPin, Navigation,
  Database, Mail, AlertTriangle, RefreshCw, Server
} from 'lucide-react';
import { Role, User, MapPreset } from '../types.js';

export const AdminDashboard: React.FC = () => {
  const {
    adminUsersList,
    bookings,
    locations,
    logs,
    adminCreateUser,
    adminUpdateUser,
    createOwnerWithBusiness,
    updateLocationConfig,
    deleteLocation,
    loading,
    token
  } = useApp();

  // Create User State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<Role>(Role.CUSTOMER);
  const [createBusinessId, setCreateBusinessId] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.CUSTOMER);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editBusinessId, setEditBusinessId] = useState('');

  // Onboard Business and Owner State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardOwnerName, setOnboardOwnerName] = useState('');
  const [onboardOwnerEmail, setOnboardOwnerEmail] = useState('');
  const [onboardOwnerPassword, setOnboardOwnerPassword] = useState('owner123');
  const [onboardBusinessName, setOnboardBusinessName] = useState('');
  const [onboardBusinessAddress, setOnboardBusinessAddress] = useState('');
  const [onboardBusinessDesc, setOnboardBusinessDesc] = useState('');
  const [onboardBusinessLat, setOnboardBusinessLat] = useState(37.7749);
  const [onboardBusinessLng, setOnboardBusinessLng] = useState(-122.4194);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  // Edit Location State
  const [editingLocation, setEditingLocation] = useState<any | null>(null);
  const [editLocName, setEditLocName] = useState('');
  const [editLocAddress, setEditLocAddress] = useState('');
  const [editLocDesc, setEditLocDesc] = useState('');
  const [editLocLat, setEditLocLat] = useState(37.7749);
  const [editLocLng, setEditLocLng] = useState(-122.4194);
  const [editLocSlotDuration, setEditLocSlotDuration] = useState(30);
  const [editLocCapacity, setEditLocCapacity] = useState(1);
  const [editLocIsActive, setEditLocIsActive] = useState(true);
  const [editLocPhone, setEditLocPhone] = useState('');
  const [editLocInstagram, setEditLocInstagram] = useState('');
  const [editLocSubmitting, setEditLocSubmitting] = useState(false);
  const [deletingLocId, setDeletingLocId] = useState<string | null>(null);

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs' | 'businesses' | 'presets' | 'system'>('users');

  // Preset management state
  const [presets, setPresets] = useState<MapPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetLat, setNewPresetLat] = useState('4.8917');
  const [newPresetLng, setNewPresetLng] = useState('114.9401');
  const [newPresetCountry, setNewPresetCountry] = useState('Brunei');
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [presetSubmitting, setPresetSubmitting] = useState(false);
  const [presetError, setPresetError] = useState('');
  const [presetSuccess, setPresetSuccess] = useState('');

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/map-presets');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPresets(data);
      }
    } catch (err) {
      console.error('Error fetching presets in admin:', err);
    }
  };

  // System diagnostics state
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSystemStatus = async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const res = await fetch('/api/admin/system-status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch system status');
      }
      setSystemStatus(data);
    } catch (err: any) {
      setStatusError(err.message || 'Failed to connect to diagnostics API');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleTestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) return;
    setTestEmailLoading(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testEmail: testEmailAddress })
      });
      const data = await res.json();
      if (res.ok) {
        setTestEmailResult({ success: true, message: data.message || 'Email successfully sent!' });
      } else {
        setTestEmailResult({ success: false, message: data.error || 'Failed to dispatch test email.' });
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'Failed to connect to email test API.' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'presets') {
      fetchPresets();
    } else if (activeSubTab === 'system') {
      fetchSystemStatus();
    }
  }, [activeSubTab]);

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPresetError('');
    setPresetSuccess('');
    if (!newPresetName || !newPresetLat || !newPresetLng || !newPresetCountry) {
      setPresetError('All fields are required.');
      return;
    }

    setPresetSubmitting(true);
    try {
      const res = await fetch('/api/admin/map-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPresetName,
          lat: parseFloat(newPresetLat),
          lng: parseFloat(newPresetLng),
          country: newPresetCountry
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create map preset');
      }

      setPresetSuccess(`Successfully created map preset "${newPresetName}"!`);
      setNewPresetName('');
      fetchPresets();
    } catch (err: any) {
      setPresetError(err.message || 'Error occurred');
    } finally {
      setPresetSubmitting(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/map-presets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete map preset');
      }
      fetchPresets();
    } catch (err: any) {
      setPresetError(err.message || 'Error deleting preset');
    }
  };

  const handleOpenEditLocation = (loc: any) => {
    setEditingLocation(loc);
    setEditLocName(loc.name);
    setEditLocAddress(loc.address);
    setEditLocDesc(loc.description || '');
    setEditLocLat(loc.locationLat);
    setEditLocLng(loc.locationLng);
    setEditLocSlotDuration(loc.slotDuration || 30);
    setEditLocCapacity(loc.capacityPerSlot || 1);
    setEditLocIsActive(loc.isActive);
    setEditLocPhone(loc.phone || '');
    setEditLocInstagram(loc.instagram || '');
  };

  const handleEditLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLocation) return;

    setEditLocSubmitting(true);
    const success = await updateLocationConfig(editingLocation.id, {
      name: editLocName,
      address: editLocAddress,
      description: editLocDesc,
      locationLat: editLocLat,
      locationLng: editLocLng,
      slotDuration: editLocSlotDuration,
      capacityPerSlot: editLocCapacity,
      isActive: editLocIsActive,
      phone: editLocPhone,
      instagram: editLocInstagram,
    });
    setEditLocSubmitting(false);

    if (success) {
      setEditingLocation(null);
    }
  };

  const handleDeleteLocationClick = async (id: string) => {
    if (deletingLocId === id) {
      await deleteLocation(id);
      setDeletingLocId(null);
    } else {
      setDeletingLocId(id);
      setTimeout(() => {
        setDeletingLocId(current => current === id ? null : current);
      }, 4000);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      email: createEmail,
      password: createPassword,
      name: createName,
      role: createRole,
      businessId: createRole === Role.EMPLOYEE ? createBusinessId : undefined
    };

    const success = await adminCreateUser(data);
    if (success) {
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      setCreateRole(Role.CUSTOMER);
      setCreateBusinessId('');
      setShowCreateModal(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardOwnerName || !onboardOwnerEmail || !onboardBusinessName || !onboardBusinessAddress) return;

    setOnboardSubmitting(true);
    const success = await createOwnerWithBusiness({
      ownerName: onboardOwnerName,
      ownerEmail: onboardOwnerEmail,
      ownerPassword: onboardOwnerPassword,
      businessName: onboardBusinessName,
      businessAddress: onboardBusinessAddress,
      businessDesc: onboardBusinessDesc,
      businessLat: onboardBusinessLat,
      businessLng: onboardBusinessLng
    });
    setOnboardSubmitting(false);

    if (success) {
      setOnboardOwnerName('');
      setOnboardOwnerEmail('');
      setOnboardOwnerPassword('owner123');
      setOnboardBusinessName('');
      setOnboardBusinessAddress('');
      setOnboardBusinessDesc('');
      setShowOnboardModal(false);
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditIsActive(u.isActive);
    setEditBusinessId(u.businessId || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const data = {
      name: editName,
      email: editEmail,
      role: editRole,
      isActive: editIsActive,
      businessId: editRole === Role.EMPLOYEE ? editBusinessId : undefined
    };

    const success = await adminUpdateUser(editingUser.id, data);
    if (success) {
      setEditingUser(null);
    }
  };

  const handleToggleUserStatus = async (userToToggle: User) => {
    const data = {
      isActive: !userToToggle.isActive
    };
    await adminUpdateUser(userToToggle.id, data);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Admin Title */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="bg-red-500/20 text-red-400 text-xs font-mono font-bold px-3 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">
            Platform Operator Room
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 text-white">
            System Administration
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Audit logs tracking, RBAC role escalation management, user suspension, and overall marketplace logistics.
          </p>
        </div>

        {/* Global Statistics */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Total Users</span>
            <strong className="text-lg font-black text-white font-mono">{adminUsersList.length}</strong>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Locations</span>
            <strong className="text-lg font-black text-white font-mono">{locations.length}</strong>
          </div>
          <div className="bg-slate-800 border border-slate-700/50 px-4 py-2 rounded-xl text-center min-w-24">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Bookings</span>
            <strong className="text-lg font-black text-white font-mono">{bookings.length}</strong>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selection */}
      <div className="border-b border-slate-200 flex gap-4 text-sm font-semibold">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'users'
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="admin-subtab-users"
        >
          <Users className="h-4 w-4" /> User Management
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'logs'
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="admin-subtab-logs"
        >
          <Activity className="h-4 w-4" /> System Audit Logs
        </button>
        <button
          onClick={() => setActiveSubTab('businesses')}
          className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'businesses'
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="admin-subtab-businesses"
        >
          <Sliders className="h-4 w-4" /> Business Locations
        </button>
        <button
          onClick={() => setActiveSubTab('presets')}
          className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'presets'
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="admin-subtab-presets"
        >
          <Navigation className="h-4 w-4" /> Map Presets
        </button>
        <button
          onClick={() => setActiveSubTab('system')}
          className={`pb-3.5 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'system'
              ? 'border-red-600 text-red-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          id="admin-subtab-system"
        >
          <Server className="h-4 w-4" /> Database & System Diagnostics
        </button>
      </div>

      {/* Sub Tab: Users */}
      {activeSubTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">Platform Accounts</h2>
              <p className="text-xs text-slate-400">Total accounts registered in the database</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              id="admin-create-user-trigger"
            >
              <UserPlus className="h-4 w-4" /> Create User Profile
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="admin-users-table">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Badge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs sm:text-sm">
                {adminUsersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.name}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500">{u.email}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono border ${
                        u.role === Role.ADMIN
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : u.role === Role.OWNER
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : u.role === Role.EMPLOYEE
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : u.role === Role.SPECIAL
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-sky-50 border-sky-200 text-sky-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        u.isActive ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {u.isActive ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {u.isActive ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-mono text-xs">{u.createdAt.substring(0, 10)}</td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Edit User Profile"
                        id={`edit-user-btn-${u.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`p-1 font-bold text-xs rounded transition-all cursor-pointer ${
                          u.isActive
                            ? 'text-rose-500 hover:bg-rose-50'
                            : 'text-emerald-500 hover:bg-emerald-50'
                        }`}
                        title={u.isActive ? 'Lock User account' : 'Unlock User account'}
                        id={`lock-user-btn-${u.id}`}
                      >
                        {u.isActive ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub Tab: System Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Operational Log Streams</h2>
            <p className="text-xs text-slate-400">Cryptographically isolated trails auditing state-modifying actions</p>
          </div>

          <div className="space-y-3 font-mono text-xs max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="text-center py-8 text-slate-400 italic">No system audit logs found.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-100/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-red-50 text-red-800 text-[10px] px-1.5 py-0.5 rounded font-extrabold border border-red-100">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[10px]">|</span>
                      <span className="text-slate-600 font-semibold">{log.userEmail}</span>
                    </div>
                    <p className="text-slate-500 font-sans text-xs">{log.details}</p>
                  </div>

                  <span className="text-slate-400 text-[10px] sm:text-right font-mono self-start sm:self-center shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub Tab: Businesses */}
      {activeSubTab === 'businesses' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">System Marketplace Directory</h2>
              <p className="text-xs text-slate-400">Manage directory locations and general offline parameters</p>
            </div>
            <button
              onClick={() => setShowOnboardModal(true)}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
              id="admin-onboard-business-trigger"
            >
              <Plus className="h-4 w-4" /> Onboard Business & Owner
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((loc) => (
              <div key={loc.id} className="border border-slate-150 p-4 rounded-2xl flex flex-col justify-between hover:border-slate-300 bg-slate-50/50">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-800">{loc.name}</h3>
                    <span className="bg-red-50 text-red-700 border border-red-100 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                      ID: {loc.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{loc.address}</p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{loc.description}</p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                  <div className="flex gap-4 text-[11px] text-slate-400 font-medium">
                    <span>Slot: {loc.slotDuration} min</span>
                    <span>Capacity: {loc.capacityPerSlot} cap</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                      loc.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditLocation(loc)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      title="Edit location properties"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLocationClick(loc.id)}
                      className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all ${
                        deletingLocId === loc.id
                          ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      }`}
                      title="Delete location"
                    >
                      {deletingLocId === loc.id ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab: Presets */}
      {activeSubTab === 'presets' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="pb-4 border-b border-slate-100 mb-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Map Presets Management</h2>
            <p className="text-xs text-slate-400">Add or remove geographical shortcut buttons used on the customer search map</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form to Add Preset */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl">
                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-red-600" /> Create Shortcut Preset
                </h3>

                <form onSubmit={handleCreatePreset} className="space-y-3.5">
                  {presetError && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-xl border border-red-100 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      <span>{presetError}</span>
                    </div>
                  )}

                  {presetSuccess && (
                    <div className="p-3 bg-green-50 text-green-800 text-xs font-semibold rounded-xl border border-green-100 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span>{presetSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Preset Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Gadong Mall"
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 bg-white text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Country / Region</label>
                    <input
                      type="text"
                      placeholder="e.g. Brunei, Malaysia, USA"
                      value={newPresetCountry}
                      onChange={(e) => setNewPresetCountry(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 bg-white text-slate-800"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="4.8917"
                        value={newPresetLat}
                        onChange={(e) => setNewPresetLat(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="114.9401"
                        value={newPresetLng}
                        onChange={(e) => setNewPresetLng(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 bg-white text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  {/* Visual Map Assist */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Map Assist (Click to Pin Coordinates)</label>
                    <div className="h-[450px] sm:h-[320px] rounded-xl border border-slate-200 overflow-hidden relative shadow-inner">
                      <MapSimulation
                        locations={locations}
                        interactiveSelectCoords={{ lat: parseFloat(newPresetLat) || 4.8917, lng: parseFloat(newPresetLng) || 114.9401 }}
                        onMapClickSelectCoords={(coords) => {
                          setNewPresetLat(coords.lat.toString());
                          setNewPresetLng(coords.lng.toString());
                        }}
                        userLat={parseFloat(newPresetLat) || 4.8917}
                        userLng={parseFloat(newPresetLng) || 114.9401}
                        compact={true}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 italic block mt-1">
                      💡 Scroll, pan, or click on the mini map to instantly pin coordinates
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={presetSubmitting}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    {presetSubmitting ? 'Saving Preset...' : 'Add to Presets'}
                  </button>
                </form>
              </div>
            </div>

            {/* List of presets */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800 text-sm">Active Map Presets ({presets.length})</h3>
                <span className="text-xs text-slate-400">Total shortcuts shown on map page</span>
              </div>

              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {presets.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-slate-50 border border-slate-150 rounded-2xl">
                    <Navigation className="h-8 w-8 mx-auto text-slate-300 mb-2 animate-bounce" />
                    <p className="font-semibold text-xs">No presets loaded.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Please add a preset, or default seeding will populate.</p>
                  </div>
                ) : (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-2xl shadow-3xs transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-sky-600">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{preset.name}</span>
                            <span className="bg-slate-100 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                              {preset.country}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            Lat: {preset.lat} | Lng: {preset.lng}
                          </div>
                        </div>
                      </div>

                      {deletingPresetId === preset.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in bg-rose-50 border border-rose-100 p-1.5 rounded-lg">
                          <span className="text-[10px] font-bold text-rose-700 px-1">Delete preset?</span>
                          <button
                            onClick={async () => {
                              await handleDeletePreset(preset.id);
                              setDeletingPresetId(null);
                            }}
                            className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingPresetId(null)}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded hover:bg-slate-300 transition-colors cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingPresetId(preset.id)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                          title="Delete shortcut preset"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab: System & Database Diagnostics */}
      {activeSubTab === 'system' && (
        <div className="space-y-6 animate-fade-in text-xs sm:text-sm">
          {/* Main Info Banner */}
          <div className="bg-slate-950 text-white border border-slate-800 rounded-3xl p-6 shadow-lg">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-red-500 animate-pulse" /> System & Database Integration Diagnostics
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Real-time monitoring of your production database connections, third-party credentials, mail dispatch relays, and infrastructure synchronicity. Use this operator room to troubleshoot hosting configurations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Database Status & Stats */}
            <div className="lg:col-span-7 space-y-6">
              {/* Database Connection Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-slate-700" />
                    <h3 className="font-bold text-slate-800 text-sm">Database Engine Ingress</h3>
                  </div>
                  <button
                    onClick={fetchSystemStatus}
                    disabled={statusLoading}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Refresh connection status"
                  >
                    <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {statusLoading && !systemStatus ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-red-500 mb-2" />
                    Checking database connection stats...
                  </div>
                ) : statusError ? (
                  <div className="p-4 bg-rose-50 text-rose-800 text-xs font-semibold rounded-2xl border border-rose-100 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
                    <span>Error loading diagnostic data: {statusError}</span>
                  </div>
                ) : systemStatus ? (
                  <div className="space-y-4">
                    {/* Status Indicator Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border bg-slate-50 border-slate-150 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Active Storage Engine</span>
                        <strong className="text-slate-800 font-extrabold text-sm font-mono mt-0.5 block">{systemStatus.database.type}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        {systemStatus.database.status === 'Connected' ? (
                          <span className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-150 shadow-3xs uppercase">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                            {systemStatus.database.status}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-150 shadow-3xs uppercase">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Fallback (Local DB Only)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connection details */}
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Masked Connection URL</span>
                        <code className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded block mt-1 overflow-x-auto text-slate-600 font-semibold max-w-full">
                          {systemStatus.database.connectionString}
                        </code>
                      </div>

                      {systemStatus.database.error && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2">
                          <h4 className="font-bold text-rose-800 text-xs flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            Connection Failure Detected (Supabase unreachable)
                          </h4>
                          <p className="text-xs text-rose-700 leading-relaxed font-mono bg-white p-2.5 rounded-lg border border-rose-100 max-h-32 overflow-y-auto">
                            {systemStatus.database.error}
                          </p>
                          <div className="text-[11px] text-rose-600 space-y-1.5 mt-2 leading-relaxed">
                            <p className="font-bold text-rose-900">👉 WHY IS THIS HAPPENING?</p>
                            <p>Most modern hosting platforms (like Render or Google Cloud Run) <strong>do not support outgoing IPv6 traffic</strong> by default. Newer Supabase projects default to IPv6-only on port 5432, which results in a <code className="bg-rose-100/50 px-1 py-0.5 rounded">connect ENETUNREACH</code> or connection timeout error!</p>
                            <p className="font-bold text-rose-900 mt-3">🛠️ HOW TO FIX IT (AWS / RENDER DEPLOYMENT):</p>
                            <p>You must change your <code className="bg-rose-100/50 px-1 py-0.5 rounded">DATABASE_URL</code> to use the <strong>Supabase Connection Pooler on Port 6543</strong> instead, which uses IPv4 and is fully compatible with Render.</p>
                            <p className="mt-1.5 font-semibold text-slate-700">1. Go to your Supabase Project Settings &gt; Database &gt; Connection String.</p>
                            <p className="font-semibold text-slate-700">2. Select "Transaction Mode" or "Session Mode" on port <span className="underline">6543</span> (Pooler).</p>
                            <p className="font-semibold text-slate-700">3. Update the environment variable in Render and re-deploy.</p>
                          </div>
                        </div>
                      )}

                      {!systemStatus.database.error && systemStatus.database.type.includes('PostgreSQL') && (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4 text-xs leading-relaxed">
                          <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                            <Check className="h-4 w-4 bg-emerald-100 text-emerald-700 rounded-full p-0.5" />
                            Production Synchronicity Active!
                          </p>
                          <p>Your application is successfully writing all user creations, bookings, schedule overrides, and custom map presets <strong>directly to your Supabase PostgreSQL cluster</strong> in real-time. Data will persist safely across server restarts or deploys!</p>
                        </div>
                      )}

                      {systemStatus.database.type.includes('SQLite') && !process.env.DATABASE_URL && (
                        <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 text-xs leading-relaxed">
                          <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                            <Info className="h-4 w-4 text-amber-600" />
                            Local Sandbox Active
                          </p>
                          <p>No <code className="bg-amber-100/50 px-1 py-0.5 rounded">DATABASE_URL</code> has been supplied. The app is running in stand-alone local storage mode using SQLite (<code className="bg-amber-100/50 px-1 py-0.5 rounded">data/carwash.db</code>). <strong>Warning:</strong> Local files on Render are stateless. Data will be completely wiped out on restarts or code updates.</p>
                        </div>
                      )}
                    </div>

                    {/* Stats counts */}
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="font-bold text-slate-700 text-xs mb-3">Database Records Count</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Users</span>
                          <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">{systemStatus.database.stats.usersCount}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Locations</span>
                          <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">{systemStatus.database.stats.locationsCount}</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Bookings</span>
                          <span className="text-base font-black text-slate-800 font-mono mt-0.5 block">{systemStatus.database.stats.bookingsCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Supabase OAuth & Auth Service Indicator */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Lock className="h-5 w-5 text-slate-700" />
                  <h3 className="font-bold text-slate-800 text-sm">Supabase Authentication Integration</h3>
                </div>

                {systemStatus && (
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Supabase Auth Provider Hook:</span>
                      <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                        systemStatus.supabaseAuth.enabled 
                          ? 'bg-green-50 text-green-700 border border-green-150' 
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {systemStatus.supabaseAuth.enabled ? 'ACTIVE (SUPABASE AUTH)' : 'LOCAL CRYPTO BCRYPT'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Supabase Client Endpoint</span>
                      <code className="text-xs font-mono bg-slate-50 border border-slate-100 px-2 py-1 rounded block mt-1 text-slate-600 font-semibold truncate max-w-full">
                        {systemStatus.supabaseAuth.url}
                      </code>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Service Role Bypass Key:</span>
                      <span className={`px-2 py-0.5 rounded font-bold font-mono text-[10px] border ${
                        systemStatus.supabaseAuth.hasServiceKey ? 'bg-green-50 text-green-700 border-green-150' : 'bg-rose-50 text-rose-700 border-rose-150'
                      }`}>
                        {systemStatus.supabaseAuth.hasServiceKey ? 'FOUND' : 'MISSING (SUPABASE_SERVICE_ROLE_KEY)'}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl leading-relaxed text-slate-600 space-y-2">
                      <p className="font-bold text-slate-700 text-xs">💡 ABOUT REAL vs FICTITIOUS EMAILS:</p>
                      <p>When user registration uses Supabase Auth, they register in Supabase's identity manager. When you create or sign up users, we validate email syntax. If you would like to guarantee they are <strong>real human emails</strong>, you can turn on <strong>"Confirm Email"</strong> inside your Supabase Settings &gt; Authentication cluster.</p>
                      <p className="font-bold text-slate-700 text-xs mt-3">🛠️ HOW TO ADD USERS DIRECTLY FROM SUPABASE:</p>
                      <p>You can add users directly using the Supabase Studio dashboard! Or you can insert records directly into the database. Let's refer to the database structure schema in the sidebar to ensure fields match exactly.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Mail dispatcher verification */}
            <div className="lg:col-span-5 space-y-6">
              {/* Resend Email Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Mail className="h-5 w-5 text-slate-700" />
                  <h3 className="font-bold text-slate-800 text-sm">Resend Mail Dispatcher</h3>
                </div>

                {systemStatus && (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Dispatch Status</span>
                        <span className="font-bold text-slate-700 block">{systemStatus.email.status}</span>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full ${systemStatus.email.hasApiKey ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sender "From" Address</span>
                      <strong className="text-slate-700 block font-mono font-semibold mt-0.5">{systemStatus.email.fromAddress}</strong>
                    </div>

                    {/* Email Test Form */}
                    <form onSubmit={handleTestEmailSubmit} className="pt-4 border-t border-slate-150 space-y-3">
                      <h4 className="font-bold text-slate-800 text-xs">Dispatch Diagnostics Test</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Input an active email address to test Resend API key relays. The system will send a styled operator diagnostics HTML verification letter.
                      </p>

                      <div className="space-y-2">
                        <input
                          type="email"
                          placeholder="your-email@example.com"
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 bg-white text-slate-800 font-medium"
                          required
                        />

                        <button
                          type="submit"
                          disabled={testEmailLoading}
                          className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {testEmailLoading ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Relaying Test Letter...
                            </>
                          ) : (
                            <>
                              <Mail className="h-3.5 w-3.5" />
                              Send Verification Email
                            </>
                          )}
                        </button>
                      </div>

                      {testEmailResult && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-fade-in ${
                          testEmailResult.success 
                            ? 'bg-green-50 border-green-100 text-green-800' 
                            : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}>
                          {testEmailResult.success ? (
                            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-650" />
                          )}
                          <span className="leading-tight">{testEmailResult.message}</span>
                        </div>
                      )}
                    </form>

                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl text-[11px] text-slate-500 space-y-1.5 mt-2">
                      <p className="font-bold text-slate-700">💡 IMPORTANT RELIABILITY ADVICE:</p>
                      <p>The default "From" address <code className="bg-slate-100 font-mono px-0.5">onboarding@resend.dev</code> <strong>only allows sending to your own verified Resend account email</strong>.</p>
                      <p className="mt-1">To dispatch emails to your actual car wash customers, you <strong>must register your domain</strong> (e.g. <code className="bg-slate-100 font-mono px-0.5">yourcarwash.com</code>) inside your Resend Dashboard, configure the DNS MX/SPF records, and change the <code className="bg-slate-100 font-mono px-0.5">EMAIL_FROM_ADDRESS</code> environment variable to <code className="bg-slate-100 font-mono px-0.5">bookings@yourcarwash.com</code>.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Schema Map & SQL Guide */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <FileText className="h-5 w-5 text-slate-700" />
                  <h3 className="font-bold text-slate-800 text-sm">PostgreSQL Schema Map</h3>
                </div>

                <div className="text-xs space-y-3.5">
                  <p className="text-slate-500 leading-relaxed">
                    If you are a Data Engineer or Administrator wishing to query, edit, or insert data directly using SQL via the Supabase SQL Editor, reference the schema models below:
                  </p>

                  <div className="space-y-3">
                    <details className="border border-slate-150 rounded-xl overflow-hidden group">
                      <summary className="bg-slate-50 p-2.5 font-bold text-slate-700 cursor-pointer hover:bg-slate-100 select-none flex items-center justify-between text-xs font-semibold">
                        <span>Table: users</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="p-3 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  isActive INTEGER NOT NULL DEFAULT 1,
  businessId TEXT,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);`}
                      </pre>
                    </details>

                    <details className="border border-slate-150 rounded-xl overflow-hidden group">
                      <summary className="bg-slate-50 p-2.5 font-bold text-slate-700 cursor-pointer hover:bg-slate-100 select-none flex items-center justify-between text-xs font-semibold">
                        <span>Table: car_washes</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="p-3 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`CREATE TABLE car_washes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  slotDuration INTEGER NOT NULL,
  capacityPerSlot INTEGER NOT NULL,
  isActive INTEGER NOT NULL,
  ownerId TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  createdAt TEXT NOT NULL
);`}
                      </pre>
                    </details>

                    <details className="border border-slate-150 rounded-xl overflow-hidden group">
                      <summary className="bg-slate-50 p-2.5 font-bold text-slate-700 cursor-pointer hover:bg-slate-100 select-none flex items-center justify-between text-xs font-semibold">
                        <span>Table: bookings</span>
                        <span className="text-[10px] text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <pre className="p-3 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  carWashId TEXT NOT NULL,
  customerId TEXT NOT NULL,
  customerName TEXT NOT NULL,
  customerEmail TEXT NOT NULL,
  date TEXT NOT NULL,
  timeSlot TEXT NOT NULL,
  status TEXT NOT NULL,
  serviceName TEXT,
  price REAL,
  paymentBank TEXT,
  txnReference TEXT,
  receiptUrl TEXT,
  employeeId TEXT,
  createdAt TEXT NOT NULL
);`}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Register Profile Panel</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role Allocation</label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                >
                  <option value={Role.CUSTOMER}>CUSTOMER</option>
                  <option value={Role.OWNER}>OWNER</option>
                  <option value={Role.EMPLOYEE}>EMPLOYEE (Operator)</option>
                  <option value={Role.SPECIAL}>SPECIAL (Partner)</option>
                  <option value={Role.ADMIN}>ADMIN (Full Control)</option>
                </select>
              </div>

              {createRole === Role.EMPLOYEE && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Business ID</label>
                  <select
                    value={createBusinessId}
                    onChange={(e) => setCreateBusinessId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                    required
                  >
                    <option value="">-- Choose Business --</option>
                    {locations.map((cw) => (
                      <option key={cw.id} value={cw.id}>{cw.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                id="admin-create-user-btn"
              >
                Create Account Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Edit User Profile</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role Allocation</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                >
                  <option value={Role.CUSTOMER}>CUSTOMER</option>
                  <option value={Role.OWNER}>OWNER</option>
                  <option value={Role.EMPLOYEE}>EMPLOYEE</option>
                  <option value={Role.SPECIAL}>SPECIAL</option>
                  <option value={Role.ADMIN}>ADMIN</option>
                </select>
              </div>

              {editRole === Role.EMPLOYEE && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Business ID</label>
                  <select
                    value={editBusinessId}
                    onChange={(e) => setEditBusinessId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700"
                    required
                  >
                    <option value="">-- Choose Business --</option>
                    {locations.map((cw) => (
                      <option key={cw.id} value={cw.id}>{cw.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="h-4 w-4 accent-red-600 rounded"
                />
                <span className="font-semibold text-slate-700 text-xs">Active Account Status</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                id="admin-save-user-btn"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Onboard Business and Owner Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-red-600" />
                  Onboard Business & Owner
                </h3>
                <p className="text-xs text-slate-400">Register a new car wash location and create its Owner profile simultaneously.</p>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-6 text-xs sm:text-sm">
              {/* Part 1: Owner Profile details */}
              <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-red-50 text-red-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  Merchant Account Profile (Owner)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Owner Contact Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Jack Owner"
                      value={onboardOwnerName}
                      onChange={(e) => setOnboardOwnerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="owner@carwash.com"
                      value={onboardOwnerEmail}
                      onChange={(e) => setOnboardOwnerEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={onboardOwnerPassword}
                      onChange={(e) => setOnboardOwnerPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500 font-mono font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Business Location details */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="bg-red-50 text-red-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  Business Location Details (Facility)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Facility Name</label>
                    <input
                      type="text"
                      placeholder="Downtown Crystal Clean"
                      value={onboardBusinessName}
                      onChange={(e) => setOnboardBusinessName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Physical Address</label>
                    <input
                      type="text"
                      placeholder="455 Market St, San Francisco, CA"
                      value={onboardBusinessAddress}
                      onChange={(e) => setOnboardBusinessAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
                  <textarea
                    placeholder="Describe specific cleaning and detailing amenities..."
                    rows={2}
                    value={onboardBusinessDesc}
                    onChange={(e) => setOnboardBusinessDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                </div>

                {/* Map Coordinates Selection assist */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                  <div className="sm:col-span-7 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Map Placement Assist</label>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[480px] sm:h-[400px]">
                      <MapSimulation
                        locations={[]}
                        interactiveSelectCoords={{ lat: onboardBusinessLat, lng: onboardBusinessLng }}
                        onMapClickSelectCoords={(coords) => {
                          setOnboardBusinessLat(coords.lat);
                          setOnboardBusinessLng(coords.lng);
                        }}
                        userLat={onboardBusinessLat}
                        userLng={onboardBusinessLng}
                        compact={true}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-mono text-slate-500 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Latitude (GPS Coordinate)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-90"
                          max="90"
                          value={onboardBusinessLat}
                          onChange={(e) => setOnboardBusinessLat(parseFloat(e.target.value) || 37.7749)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Longitude (GPS Coordinate)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-180"
                          max="180"
                          value={onboardBusinessLng}
                          onChange={(e) => setOnboardBusinessLng(parseFloat(e.target.value) || -122.4194)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      💡 Click on the mini interactive map on the left to pin, or manually edit coordinates here.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                  id="admin-onboard-submit-btn"
                >
                  {onboardSubmitting ? 'Onboarding...' : 'Onboard Business & Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Edit Business Location Modal */}
      {editingLocation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-1.5">
                  <Edit className="h-5 w-5 text-red-600" />
                  Edit Business Location
                </h3>
                <p className="text-xs text-slate-400">Configure parameters, schedule slot duration, capacity, and active status.</p>
              </div>
              <button
                onClick={() => setEditingLocation(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditLocationSubmit} className="space-y-6 text-xs sm:text-sm">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Facility Name</label>
                    <input
                      type="text"
                      placeholder="Downtown Crystal Clean"
                      value={editLocName}
                      onChange={(e) => setEditLocName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Physical Address</label>
                    <input
                      type="text"
                      placeholder="455 Market St, San Francisco, CA"
                      value={editLocAddress}
                      onChange={(e) => setEditLocAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Short Description</label>
                  <textarea
                    placeholder="Describe specific cleaning and detailing amenities..."
                    rows={2}
                    value={editLocDesc}
                    onChange={(e) => setEditLocDesc(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Duration (minutes)</label>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={editLocSlotDuration}
                      onChange={(e) => setEditLocSlotDuration(parseInt(e.target.value) || 30)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Capacity Per Slot</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={editLocCapacity}
                      onChange={(e) => setEditLocCapacity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                    <select
                      value={editLocIsActive ? 'active' : 'inactive'}
                      onChange={(e) => setEditLocIsActive(e.target.value === 'active')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                    >
                      <option value="active">Active (Visible)</option>
                      <option value="inactive">Inactive (Suspended)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Phone Number</label>
                    <input
                      type="text"
                      placeholder="6738123456"
                      value={editLocPhone}
                      onChange={(e) => setEditLocPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Instagram Username</label>
                    <input
                      type="text"
                      placeholder="crystal_wash"
                      value={editLocInstagram}
                      onChange={(e) => setEditLocInstagram(e.target.value.trim().replace(/^@/, ''))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Map Coordinates Selection assist */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2">
                  <div className="sm:col-span-7 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Map Placement Assist</label>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden relative h-[480px] sm:h-[400px]">
                      <MapSimulation
                        locations={[]}
                        interactiveSelectCoords={{ lat: editLocLat, lng: editLocLng }}
                        onMapClickSelectCoords={(coords) => {
                          setEditLocLat(coords.lat);
                          setEditLocLng(coords.lng);
                        }}
                        userLat={editLocLat}
                        userLng={editLocLng}
                        compact={true}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-mono text-slate-500 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Latitude (GPS Coordinate)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-90"
                          max="90"
                          value={editLocLat}
                          onChange={(e) => setEditLocLat(parseFloat(e.target.value) || 37.7749)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Longitude (GPS Coordinate)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="-180"
                          max="180"
                          value={editLocLng}
                          onChange={(e) => setEditLocLng(parseFloat(e.target.value) || -122.4194)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white font-mono font-bold text-xs"
                          required
                        />
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 italic">
                      💡 Click on the mini interactive map on the left to pin, or manually edit coordinates here.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLocation(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLocSubmitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  {editLocSubmitting ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
