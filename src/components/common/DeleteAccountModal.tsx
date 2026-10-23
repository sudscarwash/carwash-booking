import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { currentUser, deleteAccount } = useAuth();
  const { orders } = useOrders();

  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('NO_LONGER_NEEDED');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Check for active orders associated with this user
  const activeOrders = orders.filter(o => {
    const isCustomerOrder = o.customerId === currentUser.id && !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.status);
    const isRunnerOrder = o.runnerId === currentUser.id && ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status);
    return isCustomerOrder || isRunnerOrder;
  });

  const hasActiveOrders = activeOrders.length > 0;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (hasActiveOrders) {
      setErrorMsg('Cannot delete account: You have active orders or deliveries in transit. Please complete or cancel them first.');
      return;
    }

    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setErrorMsg('Please type "DELETE" in capital letters to confirm.');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount(currentUser.id);
      setIsSuccess(true);
      setTimeout(() => {
        setIsDeleting(false);
        setIsSuccess(false);
        onClose();
        if (onDeleted) onDeleted();
      }, 1800);
    } catch {
      setErrorMsg('Failed to delete account. Please try again or contact support.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#16241B]">Delete Account</h3>
              <p className="text-xs text-rose-700 font-medium">Permanent data erasure & de-registration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-[#526056] flex items-center justify-center cursor-pointer border border-rose-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-extrabold text-[#16241B] text-base">Account Deleted</h4>
            <p className="text-xs text-[#526056]">
              Your account and personal data have been permanently erased from the platform. You are now browsing as a guest.
            </p>
          </div>
        ) : (
          <form onSubmit={handleDelete} className="p-6 space-y-4">
            {/* Warning block */}
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>This action is permanent and cannot be undone</span>
              </div>
              <ul className="text-[11px] text-amber-900 list-disc list-inside space-y-1">
                <li>Your profile, saved delivery addresses, and phone contacts will be deleted.</li>
                {currentUser.role === 'RUNNER' && (
                  <li>Your courier KYC credentials, driving license records, and runner wallet will be terminated.</li>
                )}
                {currentUser.role === 'RESTAURANT_OWNER' && (
                  <li>Ownership ties to your restaurant listings will be severed.</li>
                )}
                <li>Past accounting records (tax/invoices) are scrubbed of personal identifying information.</li>
              </ul>
            </div>

            {/* Active order block error */}
            {hasActiveOrders && (
              <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Cannot delete account right now:</strong> You have {activeOrders.length} active order(s) or delivery run(s) in progress. Please complete or cancel them before proceeding.
                </p>
              </div>
            )}

            {errorMsg && !hasActiveOrders && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#16241B] mb-1">
                Why are you leaving? (Optional)
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3 py-2 text-xs text-[#16241B] cursor-pointer"
              >
                <option value="NO_LONGER_NEEDED">I no longer need this service</option>
                <option value="PRIVACY_CONCERN">Privacy / data protection reasons</option>
                <option value="SWITCHING_PLATFORMS">Moving to another platform</option>
                <option value="TEMPORARY">Creating a new account</option>
                <option value="OTHER">Other reason</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#16241B] mb-1">
                Type <span className="font-mono text-rose-600 font-extrabold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={hasActiveOrders}
                className="w-full bg-[#F6F7F5] border border-[#DCE3DD] rounded-xl px-3.5 py-2 text-xs text-[#16241B] font-mono tracking-wider uppercase focus:ring-2 focus:ring-rose-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#DCE3DD] text-xs font-bold text-[#526056] hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting || hasActiveOrders || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <span>Erasing data...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
