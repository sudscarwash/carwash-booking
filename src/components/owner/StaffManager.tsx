import React, { useState } from 'react';
import { Restaurant, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePlatform } from '../../context/PlatformContext';
import { Users, Plus, ShieldCheck, UserCheck, Check, Trash2, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface StaffManagerProps {
  restaurant: Restaurant;
}

export const StaffManager: React.FC<StaffManagerProps> = ({ restaurant }) => {
  const { allUsers, createUserByAdminOrOwner } = useAuth();
  const { config } = usePlatform();

  const [isInviting, setIsInviting] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('Line Chef / KDS Operator');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'order:update_kitchen',
    'staff:view_kds',
    'menu:read'
  ]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter employees associated with this restaurant or with role EMPLOYEE for this restaurant
  const employees = allUsers.filter(u => u.restaurantId === restaurant.id || (u.role === 'EMPLOYEE' && !u.restaurantId));

  const permissionsList = [
    { key: 'order:update_kitchen', label: 'Update Kitchen Status (KDS)', desc: 'Advance tickets from Pending to Cooking and Ready' },
    { key: 'staff:view_kds', label: 'View Kitchen Display System', desc: 'Access active kitchen queue tablet screen' },
    { key: 'menu:read', label: 'View Menu Configurations', desc: 'Read ingredient formulas and recipes' },
  ];

  const handleTogglePermission = (key: string) => {
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newEmail.trim() || !newFirstName.trim() || !newLastName.trim()) {
      setErrorMessage('Please provide the employee’s First Name, Last Name, and Email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUserByAdminOrOwner({
        email: newEmail.trim(),
        firstName: newFirstName.trim(),
        lastName: newLastName.trim(),
        role: 'EMPLOYEE',
        restaurantId: restaurant.id,
        employeePermissions: selectedPermissions,
      });

      setFeedbackMessage(`Staff account for ${newFirstName} created & invitation email dispatched via ${config.emailProvider || 'Resend'}.`);
      setNewFirstName('');
      setNewLastName('');
      setNewEmail('');
      setIsInviting(false);

      setTimeout(() => setFeedbackMessage(null), 5000);
    } catch {
      setErrorMessage('Failed to provision staff member. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#132218] font-display">Kitchen & Front-of-House Staff</h2>
          <p className="text-xs text-[#4F6155]">
            Restaurant Owners can invite, provision, and delegate permissions for kitchen staff and cashiers.
          </p>
        </div>

        <button
          onClick={() => setIsInviting(true)}
          className="px-4 py-2 rounded-xl bg-[#247545] text-white text-xs font-bold hover:bg-[#1E6038] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Invite Employee</span>
        </button>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isInviting && (
        <form onSubmit={handleSendInvite} className="p-5 bg-[#F5F7F4] rounded-2xl border border-[#D9E2D9] space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#132218] uppercase tracking-wider">
              Provision Restaurant Employee Account
            </h4>
            <button
              type="button"
              onClick={() => setIsInviting(false)}
              className="text-xs text-[#7A8E80] hover:text-[#132218] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">First Name *</label>
              <input
                type="text"
                placeholder="Alex"
                required
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:outline-none focus:ring-2 focus:ring-[#247545]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Last Name *</label>
              <input
                type="text"
                placeholder="Tan"
                required
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:outline-none focus:ring-2 focus:ring-[#247545]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Employee Email Address *</label>
              <input
                type="email"
                required
                placeholder="chef.alex@trattoria.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:outline-none focus:ring-2 focus:ring-[#247545]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#4F6155] block mb-1">Role Title</label>
              <input
                type="text"
                value={newRoleTitle}
                onChange={(e) => setNewRoleTitle(e.target.value)}
                className="w-full bg-white border border-[#D9E2D9] rounded-xl px-3 py-2 text-xs text-[#132218] focus:outline-none focus:ring-2 focus:ring-[#247545]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#4F6155] block mb-1.5">Grant Permissions</label>
            <div className="space-y-1.5">
              {permissionsList.map(perm => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#D9E2D9] text-xs cursor-pointer hover:bg-emerald-50/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm.key)}
                    onChange={() => handleTogglePermission(perm.key)}
                    className="rounded text-[#247545] focus:ring-[#247545]"
                  />
                  <div>
                    <span className="font-bold text-[#132218] block">{perm.label}</span>
                    <span className="text-[10px] text-[#7A8E80]">{perm.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[10px] text-[#7A8E80]">
              Notification email will be dispatched via <strong>{config.emailProvider || 'Resend'}</strong> adapter.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#247545] text-white text-xs font-bold hover:bg-[#1E6038] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Provisioning...' : 'Dispatch Invite & Create Account'}</span>
            </button>
          </div>
        </form>
      )}

      {/* In-House Dedicated Runner Fleet & PIN Onboarding Card */}
      <div className="bg-white p-5 rounded-3xl border border-[#D9E2D9] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">🛵</span>
              <h3 className="font-bold text-sm text-[#132218]">Dedicated In-House Delivery Runners</h3>
            </div>
            <p className="text-xs text-[#4F6155] max-w-xl">
              Restaurant Owners can link in-house runners using this driver fleet code. In-house runners bypass the platform $0.50 dispatch fee.
            </p>
          </div>

          <div className="bg-[#FAFBF9] border border-[#D9E2D9] p-3 rounded-2xl flex items-center gap-3 shrink-0">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#4F6155] block">Driver Fleet PIN</span>
              <span className="font-mono text-base font-black text-[#247545] tracking-widest">884219</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText('884219');
                alert('Copied Runner Fleet PIN: 884219');
              }}
              className="px-3 py-1.5 bg-[#132218] hover:bg-[#233529] text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Copy PIN
            </button>
          </div>
        </div>

        <div className="p-3 bg-[#EAF3EC] rounded-xl border border-[#247545]/20 text-[11px] text-[#247545] flex items-center justify-between">
          <span>
            Active In-House Drivers: <strong>1 Driver On-Duty (Faisal bin Haji Ahmad)</strong>
          </span>
          <span className="font-mono font-bold">$125.00 cash pending shift hand-in</span>
        </div>
      </div>

      {/* Staff List */}
      <div className="space-y-3">
        {employees.map(emp => (
          <div
            key={emp.id}
            className="bg-white rounded-2xl p-4 border border-[#D9E2D9] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EDF1EC] flex items-center justify-center text-[#132218] font-bold text-sm">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-[#132218]">{emp.firstName} {emp.lastName}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E0F2E6] text-[#247545] border border-[#C2E4CD]">
                    Active Staff
                  </span>
                  {emp.isEmailVerified && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7A8E80] flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" /> {emp.email}
                </p>
              </div>
            </div>

            {/* Configured Permissions Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {permissionsList.map(perm => (
                <span
                  key={perm.key}
                  className="px-2.5 py-1 rounded-lg bg-[#F5F7F4] text-[#4F6155] text-[11px] font-semibold border border-[#D9E2D9] flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-[#247545]" />
                  {perm.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
