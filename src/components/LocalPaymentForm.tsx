import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, Sparkles, Receipt, Landmark, Info } from 'lucide-react';
import { CarWash } from '../types.js';

interface LocalPaymentFormProps {
  carWash: CarWash;
  date: string;
  timeSlot: string;
  notes: string;
  token: string | null;
  onSuccess: (bookingData: any) => void;
  onCancel: () => void;
  serviceId?: string;
  serviceName?: string;
  price?: number;
}

export const LocalPaymentForm: React.FC<LocalPaymentFormProps> = ({
  carWash,
  date,
  timeSlot,
  notes,
  token,
  onSuccess,
  onCancel,
  serviceId,
  serviceName,
  price,
}) => {
  const [paymentBank, setPaymentBank] = useState<string>('');
  const [txnReference, setTxnReference] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if banks are enabled from owner config. Fall back to showing both if neither is explicitly configured.
  const isBibdConfigured = carWash.bibdEnabled === true;
  const isBaiduriConfigured = carWash.baiduriEnabled === true;
  const showBibd = isBibdConfigured || (!isBibdConfigured && !isBaiduriConfigured);
  const showBaiduri = isBaiduriConfigured || (!isBibdConfigured && !isBaiduriConfigured);

  interface PaymentOption {
    id: string;
    providerName: string;
    accountName: string;
    accountNo: string;
    instructions: string;
    color: string;
    badgeColor: string;
    iconColor: string;
    qrColor: string;
    qrImageUrl?: string;
  }

  const paymentOptions: PaymentOption[] = [];

  if (showBibd) {
    paymentOptions.push({
      id: 'BIBD',
      providerName: 'BIBD QuickPay',
      accountName: carWash.bibdAccountName || 'CRYSTAL CLEAN CAR WASH',
      accountNo: carWash.bibdAccountNo || '00-015-01-0012345',
      instructions: 'Scan the BIBD QuickPay QR code below using your BIBD Mobile App and input the exact service charge. Please enter your mobile number in the payment remarks.',
      color: 'border-yellow-500 bg-yellow-50/50 text-yellow-800 hover:bg-yellow-50/20',
      badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      iconColor: 'text-yellow-600',
      qrColor: '#EAB308',
      qrImageUrl: carWash.bibdQrImageUrl || undefined,
    });
  }

  if (showBaiduri) {
    paymentOptions.push({
      id: 'Baiduri',
      providerName: 'Baiduri Qpay',
      accountName: carWash.baiduriAccountName || 'CRYSTAL CLEAN CAR WASH CO.',
      accountNo: carWash.baiduriAccountNo || '02-00-110-1234567',
      instructions: 'Scan the Baiduri Qpay QR code below using your Baiduri b.Digital app. Double-check that the merchant name matches before confirming transfer.',
      color: 'border-red-500 bg-red-50/50 text-red-800 hover:bg-red-50/20',
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
      iconColor: 'text-red-600',
      qrColor: '#EF4444',
      qrImageUrl: carWash.baiduriQrImageUrl || undefined,
    });
  }

  // Inject any enabled custom/other payment options (TARUS, Pocket, etc.)
  if (carWash.customPaymentMethods && Array.isArray(carWash.customPaymentMethods)) {
    carWash.customPaymentMethods.forEach((method) => {
      if (method.isEnabled) {
        paymentOptions.push({
          id: method.id,
          providerName: method.providerName,
          accountName: method.accountName,
          accountNo: method.accountNo,
          instructions: method.instructions || `Transfer directly to this account via ${method.providerName} and upload the screenshot receipt below as proof of transfer.`,
          color: 'border-sky-500 bg-sky-50/50 text-sky-800 hover:bg-sky-50/20',
          badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
          iconColor: 'text-sky-600',
          qrColor: '#0284C7',
          qrImageUrl: method.qrImageUrl || undefined,
        });
      }
    });
  }

  // Auto-select option if only one total is available
  React.useEffect(() => {
    if (paymentOptions.length === 1) {
      setPaymentBank(paymentOptions[0].id);
    }
  }, [paymentOptions.length]);

  const selectedOption = paymentOptions.find(o => o.id === paymentBank);


  const handleFileChange = (file: File) => {
    setErrorMsg(null);

    // Enforce 3MB file size limit to prevent DoS attacks
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      setErrorMsg('The screenshot file exceeds the strict 3MB limit. Please upload a compressed image.');
      return;
    }

    // Strict extension and MIME-type checks
    const allowedExtensions = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedExtensions.includes(file.type)) {
      setErrorMsg('Invalid file type. Only JPEG, JPG, and PNG formats are accepted.');
      return;
    }

    setReceiptFile(file);

    // Set preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!paymentBank) {
      setErrorMsg('Please select your local Brunei payment bank (BIBD or Baiduri).');
      return;
    }

    if (!txnReference.trim()) {
      setErrorMsg('Please enter the transaction reference number from your bank transfer receipt.');
      return;
    }

    if (!receiptFile) {
      setErrorMsg('Please upload a screenshot of your successful transaction receipt.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('carWashId', carWash.id);
      formData.append('date', date);
      formData.append('timeSlot', timeSlot);
      formData.append('notes', notes);
      formData.append('paymentBank', paymentBank);
      // Clean and sanitize the reference number
      formData.append('txnReference', txnReference.trim().toUpperCase());
      formData.append('receipt', receiptFile);
      if (serviceId) formData.append('serviceId', serviceId);
      if (serviceName) formData.append('serviceName', serviceName);
      if (price !== undefined) formData.append('price', price.toString());

      const headers = new Headers();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      // Content-Type is intentionally left unset so the browser sets the correct boundary

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking and payment details.');
      }

      onSuccess(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred. Please verify your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm max-w-xl mx-auto" id="local-payment-form">
      {/* Title Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
          <Receipt className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Manual Local Bank Payment</h2>
          <p className="text-xs text-gray-500">Pay via QuickPay/Qpay QR Codes (Brunei Darussalam)</p>
        </div>
      </div>

      {/* Booking Summary Box */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Booking Summary</span>
        <div className="grid grid-cols-2 gap-y-1.5 text-gray-700">
          <div>Facility:</div>
          <div className="font-semibold text-gray-900 text-right">{carWash.name}</div>
          <div>Date:</div>
          <div className="font-semibold text-gray-900 text-right">{date}</div>
          <div>Time Slot:</div>
          <div className="font-semibold text-gray-900 text-right">{timeSlot}</div>
          {serviceName && (
            <>
              <div>Service:</div>
              <div className="font-semibold text-sky-700 text-right">{serviceName}</div>
            </>
          )}
          {price !== undefined && (
            <>
              <div>Service Price:</div>
              <div className="font-extrabold text-emerald-700 text-right">BND ${price.toFixed(2)}</div>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Bank */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-800">1. Select Your Local Brunei Bank or E-Wallet</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setPaymentBank(option.id);
                  setErrorMsg(null);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center ${
                  paymentBank === option.id
                    ? `${option.id === 'BIBD' ? 'border-yellow-500 bg-yellow-50/20 text-yellow-900' : option.id === 'Baiduri' ? 'border-red-500 bg-red-50/20 text-red-900' : 'border-sky-500 bg-sky-50/20 text-sky-900'} font-semibold`
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Landmark className={`w-6 h-6 mb-2 ${option.iconColor}`} />
                <span className="text-sm font-semibold">{option.providerName}</span>
                <span className="text-[10px] text-gray-400">Manual Transfer / Scan</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Dynamic QR Code Display */}
        {selectedOption && (
          <div className={`p-4 rounded-xl border-l-4 border ${selectedOption.color} space-y-4`}>
            <div>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border mb-2 ${selectedOption.badgeColor}`}>
                {selectedOption.providerName.toUpperCase()} DETAILS
              </span>
              <p className="text-xs leading-relaxed">{selectedOption.instructions}</p>
            </div>

            {/* QR Code Section: actual uploaded QR or fallback simulated Vector QR */}
            <div className="flex justify-center py-2">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                {selectedOption.qrImageUrl ? (
                  <div className="relative group text-center flex flex-col items-center">
                    <img 
                      src={selectedOption.qrImageUrl} 
                      className="w-44 h-44 object-contain rounded-xl border border-slate-200 p-1 bg-white hover:scale-105 transition-transform cursor-zoom-in" 
                      alt={`${selectedOption.providerName} QR Code`}
                      title="Click to view full image"
                      onClick={() => window.open(selectedOption.qrImageUrl, '_blank')}
                    />
                    <span className="text-[9px] text-slate-400 mt-1 font-semibold block bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                      📱 Click to view / zoom QR
                    </span>
                  </div>
                ) : (
                  <svg width="150" height="150" viewBox="0 0 100 100" className="w-36 h-36">
                    {/* Outer Frame */}
                    <rect width="100" height="100" fill="#FFFFFF" rx="8" />
                    {/* QR Pattern Simulation */}
                    <rect x="5" y="5" width="25" height="25" fill={selectedOption.qrColor} rx="3" />
                    <rect x="8" y="8" width="19" height="19" fill="#FFFFFF" rx="1.5" />
                    <rect x="11" y="11" width="13" height="13" fill={selectedOption.qrColor} />

                    <rect x="70" y="5" width="25" height="25" fill={selectedOption.qrColor} rx="3" />
                    <rect x="73" y="8" width="19" height="19" fill="#FFFFFF" rx="1.5" />
                    <rect x="76" y="11" width="13" height="13" fill={selectedOption.qrColor} />

                    <rect x="5" y="70" width="25" height="25" fill={selectedOption.qrColor} rx="3" />
                    <rect x="8" y="73" width="19" height="19" fill="#FFFFFF" rx="1.5" />
                    <rect x="11" y="76" width="13" height="13" fill={selectedOption.qrColor} />

                    {/* Randomized Inner Blocks */}
                    <rect x="35" y="10" width="8" height="20" fill={selectedOption.qrColor} rx="1" />
                    <rect x="48" y="5" width="15" height="8" fill={selectedOption.qrColor} rx="1" />
                    <rect x="45" y="20" width="18" height="15" fill={selectedOption.qrColor} rx="1" />
                    <rect x="10" y="35" width="20" height="8" fill={selectedOption.qrColor} rx="1" />
                    <rect x="15" y="48" width="15" height="15" fill={selectedOption.qrColor} rx="1" />
                    <rect x="35" y="40" width="30" height="30" fill={selectedOption.qrColor} rx="3" />
                    <rect x="40" y="45" width="20" height="20" fill="#FFFFFF" rx="2" />
                    <circle cx="50" cy="50" r="5" fill={selectedOption.qrColor} />
                    <rect x="70" y="35" width="20" height="12" fill={selectedOption.qrColor} rx="1" />
                    <rect x="75" y="52" width="18" height="12" fill={selectedOption.qrColor} rx="1" />
                    <rect x="35" y="75" width="12" height="20" fill={selectedOption.qrColor} rx="1" />
                    <rect x="52" y="70" width="12" height="18" fill={selectedOption.qrColor} rx="1" />
                    <rect x="70" y="70" width="25" height="25" fill={selectedOption.qrColor} rx="3" />
                    <rect x="75" y="75" width="15" height="15" fill="#FFFFFF" rx="1.5" />
                    <rect x="80" y="80" width="5" height="5" fill={selectedOption.qrColor} />
                  </svg>
                )}
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold text-gray-400 block tracking-wider uppercase">Account Holder</span>
                  <span className="text-xs font-bold text-gray-800">{selectedOption.accountName}</span>
                  <span className="text-[11px] font-mono text-gray-600 block bg-gray-50 px-2 py-0.5 rounded border border-gray-100 mt-1 select-all">
                    {selectedOption.accountNo}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Input Reference Number */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-gray-800" htmlFor="txn-reference">
            2. Transaction Reference Number (Txn Ref)
          </label>
          <div className="relative">
            <input
              id="txn-reference"
              type="text"
              required
              disabled={!paymentBank}
              value={txnReference}
              onChange={(e) => setTxnReference(e.target.value)}
              placeholder={selectedOption ? `e.g. ${selectedOption.id === 'BIBD' ? 'BIBD10293847' : selectedOption.id === 'Baiduri' ? 'BAID98765432' : 'TRSF10293847'}` : 'Select an option first'}
              className="w-full pl-3 pr-10 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal disabled:bg-gray-50 disabled:cursor-not-allowed transition-all"
            />

            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            Enforced Verification: References are sanitized and checked against duplicate submission fraud.
          </p>
        </div>

        {/* Step 4: Secure Screenshot Drag and Drop Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-800">
            3. Upload Payment Receipt Screenshot
          </label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={paymentBank ? triggerFileInput : undefined}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
              !paymentBank
                ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                : isDragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
              accept=".jpg,.jpeg,.png"
              className="hidden"
              disabled={!paymentBank}
            />

            {receiptPreview ? (
              <div className="w-full flex flex-col items-center space-y-3">
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                  <img src={receiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-800 max-w-xs truncate">
                    {receiptFile?.name}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {receiptFile ? (receiptFile.size / (1024 * 1024)).toFixed(2) : 0} MB • Click to replace file
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="p-3 bg-gray-50 text-gray-400 rounded-xl">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">
                    {paymentBank ? 'Drag & drop payment receipt here' : 'Select bank above to unlock upload'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Accepts PNG, JPG, or JPEG • Maximum file size limit: 3MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Actions Submit / Cancel */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel Booking
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !paymentBank}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Verifying & Booking...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & Book Slot</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
