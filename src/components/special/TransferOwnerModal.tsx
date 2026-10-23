import React, { useState } from 'react';
import { Restaurant } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useRestaurants } from '../../context/RestaurantContext';
import { 
  UserCheck, 
  X, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Copy, 
  Send, 
  ExternalLink,
  Shield,
  Building2
} from 'lucide-react';

interface TransferOwnerModalProps {
  restaurant: Restaurant;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const TransferOwnerModal: React.FC<TransferOwnerModalProps> = ({
  restaurant,
  onClose,
  onSuccess,
}) => {
  const { allUsers, createUserByAdminOrOwner } = useAuth();
  const { updateRestaurantDetails } = useRestaurants();

  const currentAssignedEmail = restaurant.assignedOwnerEmail || restaurant.email || '';
  const [targetEmail, setTargetEmail] = useState(currentAssignedEmail);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState(restaurant.whatsappPhone || restaurant.phone || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter existing owners/users
  const existingOwners = allUsers.filter(u => u.role === 'RESTAURANT_OWNER');

  const handleSelectExisting = (email: string) => {
    setTargetEmail(email);
    const u = allUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (u) {
      setOwnerName(`${u.firstName} ${u.lastName}`);
      if (u.phone) setOwnerPhone(u.phone);
    }
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('Please enter a valid email address for the restaurant owner.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = targetEmail.trim().toLowerCase();
      let matchedUserId = restaurant.ownerId;

      // Check if user already exists
      const foundUser = allUsers.find(u => u.email.toLowerCase() === cleanEmail);
      if (foundUser) {
        matchedUserId = foundUser.id;
      } else {
        // Create user record on platform so their credentials are reserved
        try {
          const names = ownerName.trim().split(' ');
          const fName = names[0] || 'Restaurant';
          const lName = names.slice(1).join(' ') || 'Owner';
          const created = await createUserByAdminOrOwner({
            email: cleanEmail,
            firstName: fName,
            lastName: lName,
            role: 'RESTAURANT_OWNER',
            restaurantId: restaurant.id,
            phone: ownerPhone.trim() || undefined,
          });
          if (created) matchedUserId = created.id;
        } catch (err) {
          console.warn('Could not auto-create owner user:', err);
        }
      }

      // Update restaurant with assigned owner email
      updateRestaurantDetails(restaurant.id, {
        assignedOwnerEmail: cleanEmail,
        email: cleanEmail,
        ownerId: matchedUserId,
        whatsappPhone: ownerPhone.trim() || restaurant.whatsappPhone,
        phone: ownerPhone.trim() || restaurant.phone,
      });

      onSuccess(`Ownership for "${restaurant.name}" successfully transferred to ${cleanEmail}. The merchant can now log in and take control.`);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to reassign owner email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const claimUrl = `${window.location.origin}/?claim=${restaurant.slug}&email=${encodeURIComponent(targetEmail)}`;
  const whatsappPitch = `Salam / Hello! Your restaurant "${restaurant.name}" has been prepared on Brunei FoodFindr. 
To manage your digital menu, view customer reviews, and accept table orders:
1. Visit: ${window.location.origin}
2. Sign in with: ${targetEmail || '[your email]'}
Welcome aboard!`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(claimUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(whatsappPitch);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl border border-[#DCE3DD] max-w-lg w-full overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="p-6 bg-[#16241B] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0562B] text-white flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold font-display">Transfer Restaurant Ownership</h3>
              <p className="text-xs text-[#A6BCAD] truncate max-w-xs">{restaurant.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-[#A6BCAD] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveTransfer} className="p-6 space-y-5">
          {/* How it works info */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>How Pre-Created Directories Work</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Special Users can create directory listings and photo menus first on behalf of Brunei restaurants. 
              Once the merchant is ready, enter their email below to transfer full management control to them.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#16241B] block mb-1">
                Assign Owner Login Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. haji.ahmad@gmail.com"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#16241B] font-medium focus:ring-2 focus:ring-[#E0562B] focus:outline-hidden"
                />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">
                When the merchant logs in with this email, this restaurant will automatically appear in their Owner Portal.
              </p>
            </div>

            {/* Quick Pick Existing Registered Accounts */}
            {existingOwners.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                  Or Link to Existing Registered Merchant:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {existingOwners.slice(0, 6).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectExisting(u.email)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                        targetEmail.toLowerCase() === u.email.toLowerCase()
                          ? 'bg-[#16241B] text-white border-[#16241B]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {u.firstName} ({u.email})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[#16241B] block mb-1">
                  Owner Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Haji Ahmad"
                  className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#16241B] block mb-1">
                  WhatsApp Contact
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+673 812 3456"
                    className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl pl-8 pr-3 py-2 text-xs text-[#16241B] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Onboarding WhatsApp Pitch Generator */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#16241B] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#2F7A4F]" />
                <span>Quick WhatsApp Handover Message</span>
              </span>
              <button
                type="button"
                onClick={handleCopyWhatsapp}
                className="text-[11px] text-[#2F7A4F] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <p className="text-[11px] text-stone-600 font-mono bg-white p-2.5 rounded-xl border border-stone-200 select-all line-clamp-3">
              {whatsappPitch}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#16241B] hover:bg-[#2F7A4F] text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Transferring...' : 'Confirm Ownership Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
