import React, { createContext, useContext, useState } from 'react';
import { PlatformConfig, StorageProviderType, AuthProviderType, PaymentProviderType, EmailProviderType, DistrictDeliveryRate, RunnerTopUpRequest, CashRemittanceRecord, UserRole, PlatformBankAccount } from '../types';
import { INITIAL_CONFIG, INITIAL_TOPUP_REQUESTS, INITIAL_CASH_REMITTANCES } from '../mockData';

interface PlatformContextType {
  config: PlatformConfig;
  topUpRequests: RunnerTopUpRequest[];
  cashRemittances: CashRemittanceRecord[];
  updateConfig: (data: Partial<PlatformConfig>) => void;
  addBankAccount: (account: Omit<PlatformBankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<PlatformBankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  toggleBankAccountActive: (id: string) => void;
  toggleGlobalOrdering: () => void;
  setStorageProvider: (provider: StorageProviderType) => void;
  setAuthProvider: (provider: AuthProviderType) => void;
  setPaymentProvider: (provider: PaymentProviderType) => void;
  setEmailProvider: (provider: EmailProviderType) => void;
  addEstablishmentType: (name: string) => void;
  removeEstablishmentType: (name: string) => void;
  updateDistrictRate: (district: string, updates: Partial<DistrictDeliveryRate>) => void;
  addDistrict: (districtName: string, defaultFee?: number) => void;
  submitTopUpRequest: (request: Omit<RunnerTopUpRequest, 'id' | 'requestedAt' | 'status'>) => void;
  reviewTopUpRequest: (id: string, status: 'APPROVED' | 'REJECTED', reviewedBy: string, reviewedByRole: UserRole, rejectionReason?: string) => void;
  recordCounterCashTopUp: (data: {
    runnerId: string;
    runnerName: string;
    runnerPhone: string;
    amount: number;
    cashierName: string;
    cashierRole: UserRole;
    notes?: string;
  }) => RunnerTopUpRequest;
  recordCashRemittance: (remittance: Omit<CashRemittanceRecord, 'id' | 'timestamp'>) => void;
  acknowledgeCashRemittance: (id: string, acknowledgedBy: string) => void;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PlatformConfig>(INITIAL_CONFIG);
  const [topUpRequests, setTopUpRequests] = useState<RunnerTopUpRequest[]>(INITIAL_TOPUP_REQUESTS);
  const [cashRemittances, setCashRemittances] = useState<CashRemittanceRecord[]>(INITIAL_CASH_REMITTANCES);

  const updateConfig = (data: Partial<PlatformConfig>) => {
    setConfig(prev => ({ ...prev, ...data }));
  };

  const addBankAccount = (account: Omit<PlatformBankAccount, 'id'>) => {
    const newBank: PlatformBankAccount = {
      ...account,
      id: `bnk_${Math.random().toString(36).substring(2, 9)}`,
    };
    setConfig(prev => ({
      ...prev,
      platformBankAccounts: [...(prev.platformBankAccounts || []), newBank],
    }));
  };

  const updateBankAccount = (id: string, updates: Partial<PlatformBankAccount>) => {
    setConfig(prev => ({
      ...prev,
      platformBankAccounts: (prev.platformBankAccounts || []).map(b =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
  };

  const deleteBankAccount = (id: string) => {
    setConfig(prev => ({
      ...prev,
      platformBankAccounts: (prev.platformBankAccounts || []).filter(b => b.id !== id),
    }));
  };

  const toggleBankAccountActive = (id: string) => {
    setConfig(prev => ({
      ...prev,
      platformBankAccounts: (prev.platformBankAccounts || []).map(b =>
        b.id === id ? { ...b, isActive: !b.isActive } : b
      ),
    }));
  };

  const toggleGlobalOrdering = () => {
    setConfig(prev => ({ ...prev, globalOrderingEnabled: !prev.globalOrderingEnabled }));
  };

  const setStorageProvider = (provider: StorageProviderType) => {
    setConfig(prev => ({ ...prev, storageProvider: provider }));
  };

  const setAuthProvider = (provider: AuthProviderType) => {
    setConfig(prev => ({ ...prev, authProvider: provider }));
  };

  const setPaymentProvider = (provider: PaymentProviderType) => {
    setConfig(prev => ({ ...prev, paymentProvider: provider }));
  };

  const setEmailProvider = (provider: EmailProviderType) => {
    setConfig(prev => ({ ...prev, emailProvider: provider }));
  };

  const addEstablishmentType = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setConfig(prev => {
      if (prev.establishmentTypes.includes(trimmed)) return prev;
      return {
        ...prev,
        establishmentTypes: [...prev.establishmentTypes, trimmed]
      };
    });
  };

  const removeEstablishmentType = (name: string) => {
    setConfig(prev => ({
      ...prev,
      establishmentTypes: prev.establishmentTypes.filter(t => t !== name)
    }));
  };

  const updateDistrictRate = (district: string, updates: Partial<DistrictDeliveryRate>) => {
    setConfig(prev => ({
      ...prev,
      defaultDistrictRates: prev.defaultDistrictRates.map(r =>
        r.district === district ? { ...r, ...updates } : r
      )
    }));
  };

  const addDistrict = (districtName: string, defaultFee: number = 3.50) => {
    const trimmed = districtName.trim();
    if (!trimmed) return;
    setConfig(prev => {
      if (prev.districts.includes(trimmed)) return prev;
      const newRate: DistrictDeliveryRate = {
        district: trimmed,
        fee: defaultFee,
        estimatedMinMinutes: 25,
        estimatedMaxMinutes: 45,
        isAvailable: true,
      };
      return {
        ...prev,
        districts: [...prev.districts, trimmed],
        defaultDistrictRates: [...prev.defaultDistrictRates, newRate]
      };
    });
  };

  const submitTopUpRequest = (request: Omit<RunnerTopUpRequest, 'id' | 'requestedAt' | 'status'>) => {
    const newReq: RunnerTopUpRequest = {
      ...request,
      id: `topup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
    };
    setTopUpRequests(prev => [newReq, ...prev]);
  };

  const reviewTopUpRequest = (
    id: string, 
    status: 'APPROVED' | 'REJECTED', 
    reviewedBy: string, 
    reviewedByRole: UserRole, 
    rejectionReason?: string
  ) => {
    setTopUpRequests(prev => prev.map(req => {
      if (req.id !== id) return req;
      return {
        ...req,
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy,
        reviewedByRole,
        rejectionReason,
      };
    }));
  };

  const recordCounterCashTopUp = (data: {
    runnerId: string;
    runnerName: string;
    runnerPhone: string;
    amount: number;
    cashierName: string;
    cashierRole: UserRole;
    notes?: string;
  }): RunnerTopUpRequest => {
    const newReq: RunnerTopUpRequest = {
      id: `topup_cash_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      runnerId: data.runnerId,
      runnerName: data.runnerName,
      runnerPhone: data.runnerPhone,
      amount: data.amount,
      bankName: 'CASH_HUB',
      bankReferenceNumber: `HUB-COUNTER-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'APPROVED',
      requestedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: data.cashierName,
      reviewedByRole: data.cashierRole,
    };
    setTopUpRequests(prev => [newReq, ...prev]);
    return newReq;
  };

  const recordCashRemittance = (remittance: Omit<CashRemittanceRecord, 'id' | 'timestamp'>) => {
    const newRecord: CashRemittanceRecord = {
      ...remittance,
      id: `remit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    setCashRemittances(prev => [newRecord, ...prev]);
  };

  const acknowledgeCashRemittance = (id: string, acknowledgedBy: string) => {
    setCashRemittances(prev => prev.map(rec => {
      if (rec.id !== id) return rec;
      return {
        ...rec,
        status: 'HANDED_TO_RESTAURANT',
        acknowledgedBy,
      };
    }));
  };

  return (
    <PlatformContext.Provider
      value={{
        config,
        topUpRequests,
        cashRemittances,
        updateConfig,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        toggleBankAccountActive,
        toggleGlobalOrdering,
        setStorageProvider,
        setAuthProvider,
        setPaymentProvider,
        setEmailProvider,
        addEstablishmentType,
        removeEstablishmentType,
        updateDistrictRate,
        addDistrict,
        submitTopUpRequest,
        reviewTopUpRequest,
        recordCounterCashTopUp,
        recordCashRemittance,
        acknowledgeCashRemittance,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
};
