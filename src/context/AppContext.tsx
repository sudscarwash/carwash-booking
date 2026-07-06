/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, CarWash, Booking, AuditLog, Role } from '../types.js';

interface AppContextType {
  user: User | null;
  token: string | null;
  locations: CarWash[];
  bookings: Booking[];
  employees: User[];
  logs: AuditLog[];
  loading: boolean;
  notification: { message: string; type: 'success' | 'error' } | null;
  showNotification: (message: string, type: 'success' | 'error') => void;
  clearNotification: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    name: string,
    profileData?: {
      dateOfBirth?: string;
      gender?: string;
      profileImageUrl?: string;
      address?: string;
      phone?: string;
    }
  ) => Promise<boolean>;
  updateProfile: (profileData: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    profileImageUrl?: string;
    address?: string;
  }) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  fetchLocations: (search?: string, lat?: number, lng?: number, radius?: number) => Promise<void>;
  fetchBookings: () => Promise<void>;
  fetchEmployees: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  createBooking: (carWashId: string, date: string, timeSlot: string, notes?: string, serviceId?: string, serviceName?: string, price?: number) => Promise<boolean>;
  updateBookingStatus: (bookingId: string, status: string, notes?: string, employeeId?: string) => Promise<boolean>;
  rescheduleBooking: (bookingId: string, date: string, timeSlot: string) => Promise<boolean>;
  createEmployee: (email: string, name: string, businessId: string) => Promise<boolean>;
  updateEmployee: (id: string, name: string, email: string, businessId: string) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
  createOwnerWithBusiness: (data: any) => Promise<boolean>;
  updateLocationConfig: (id: string, data: any) => Promise<boolean>;
  deleteLocation: (id: string) => Promise<boolean>;
  adminCreateUser: (data: any) => Promise<boolean>;
  adminUpdateUser: (id: string, data: any) => Promise<boolean>;
  adminUsersList: User[];
  fetchAdminUsers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [locations, setLocations] = useState<CarWash[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [adminUsersList, setAdminUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initialize Auth from LocalStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('cw_user');
    const storedToken = localStorage.getItem('cw_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  // Fetch initial data once logged in
  useEffect(() => {
    if (token) {
      fetchLocations();
      fetchBookings();
      if (user?.role === Role.OWNER || user?.role === Role.ADMIN) {
        fetchEmployees();
      }
      if (user?.role === Role.ADMIN) {
        fetchLogs();
        fetchAdminUsers();
      }
    } else {
      // Fetch locations public-ready
      fetchLocations();
    }
  }, [token, user?.role]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const clearNotification = () => setNotification(null);

  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('cw_user', JSON.stringify(data.user));
      localStorage.setItem('cw_token', data.token);
      showNotification(`Welcome back, ${data.user.name}!`, 'success');
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    profileData?: {
      dateOfBirth?: string;
      gender?: string;
      profileImageUrl?: string;
      address?: string;
      phone?: string;
    }
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, ...profileData }),
      });
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('cw_user', JSON.stringify(data.user));
      localStorage.setItem('cw_token', data.token);
      showNotification(`Account created successfully! Welcome, ${data.user.name}!`, 'success');
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setBookings([]);
    setEmployees([]);
    setLogs([]);
    setAdminUsersList([]);
    localStorage.removeItem('cw_user');
    localStorage.removeItem('cw_token');
    showNotification('Logged out successfully.', 'success');
  };

  const forgotPassword = async (email: string): Promise<string | null> => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      showNotification(data.message, 'success');
      if (data.isSupabase) {
        return 'SUPABASE_SENT';
      }
      return data.sandboxCode || '';
    } catch (err: any) {
      showNotification(err.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      showNotification(data.message, 'success');
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async (search?: string, lat?: number, lng?: number, radius?: number) => {
    try {
      let query = '';
      const params: string[] = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (lat !== undefined) params.push(`lat=${lat}`);
      if (lng !== undefined) params.push(`lng=${lng}`);
      if (radius !== undefined) params.push(`radius=${radius}`);

      if (params.length > 0) {
        query = '?' + params.join('&');
      }

      const data = await apiFetch(`/api/car-washes${query}`);
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to fetch car wash locations:', err);
    }
  };

  const fetchBookings = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/bookings');
      setBookings(data);
    } catch (err: any) {
      console.error('Failed to fetch bookings:', err);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    try {
      const data = await apiFetch('/api/owner/employees');
      setEmployees(data);
    } catch (err: any) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchLogs = async () => {
    if (!token || user?.role !== Role.ADMIN) return;
    try {
      const data = await apiFetch('/api/admin/logs');
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const fetchAdminUsers = async () => {
    if (!token || user?.role !== Role.ADMIN) return;
    try {
      const data = await apiFetch('/api/admin/users');
      setAdminUsersList(data);
    } catch (err: any) {
      console.error('Failed to fetch admin users:', err);
    }
  };

  const createBooking = async (carWashId: string, date: string, timeSlot: string, notes?: string, serviceId?: string, serviceName?: string, price?: number): Promise<boolean> => {
    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ carWashId, date, timeSlot, notes, serviceId, serviceName, price }),
      });
      showNotification('Wash slot booked successfully!', 'success');
      fetchBookings();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string, notes?: string, employeeId?: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, notes, employeeId }),
      });
      showNotification(`Booking status updated to ${status}`, 'success');
      fetchBookings();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const rescheduleBooking = async (bookingId: string, date: string, timeSlot: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/bookings/${bookingId}/reschedule`, {
        method: 'PUT',
        body: JSON.stringify({ date, timeSlot }),
      });
      showNotification('Booking rescheduled successfully!', 'success');
      fetchBookings();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const createEmployee = async (email: string, name: string, businessId: string): Promise<boolean> => {
    try {
      await apiFetch('/api/owner/employees', {
        method: 'POST',
        body: JSON.stringify({ email, name, businessId, password: 'employee123' }), // standard initial password
      });
      showNotification(`Employee ${name} registered successfully. Default password is 'employee123'.`, 'success');
      fetchEmployees();
      if (user?.role === Role.ADMIN) {
        fetchAdminUsers();
      }
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const updateEmployee = async (id: string, name: string, email: string, businessId: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/owner/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, email, businessId }),
      });
      showNotification(`Employee ${name} updated successfully.`, 'success');
      fetchEmployees();
      if (user?.role === Role.ADMIN) {
        fetchAdminUsers();
      }
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const deleteEmployee = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/owner/employees/${id}`, {
        method: 'DELETE',
      });
      showNotification(`Employee deleted successfully.`, 'success');
      fetchEmployees();
      if (user?.role === Role.ADMIN) {
        fetchAdminUsers();
      }
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const createOwnerWithBusiness = async (data: any): Promise<boolean> => {
    try {
      await apiFetch('/api/special/create-owner', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showNotification(`Onboarded Owner & registered business location successfully!`, 'success');
      fetchLocations();
      if (user?.role === Role.ADMIN) {
        fetchAdminUsers();
      }
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const updateLocationConfig = async (id: string, data: any): Promise<boolean> => {
    try {
      await apiFetch(`/api/car-washes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      showNotification('Business configuration updated successfully!', 'success');
      fetchLocations();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const deleteLocation = async (id: string): Promise<boolean> => {
    try {
      await apiFetch(`/api/car-washes/${id}`, {
        method: 'DELETE',
      });
      showNotification('Business location deleted successfully.', 'success');
      fetchLocations();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const adminCreateUser = async (data: any): Promise<boolean> => {
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showNotification(`Created user ${data.name} successfully`, 'success');
      fetchAdminUsers();
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const adminUpdateUser = async (id: string, data: any): Promise<boolean> => {
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      showNotification(`Updated user successfully`, 'success');
      fetchAdminUsers();
      fetchBookings(); // Employees assignment or roles changes might affect bookings visibility
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  const updateProfile = async (profileData: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    profileImageUrl?: string;
    address?: string;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      setUser(data);
      localStorage.setItem('cw_user', JSON.stringify(data));
      showNotification('Profile updated successfully!', 'success');
      return true;
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        locations,
        bookings,
        employees,
        logs,
        loading,
        notification,
        showNotification,
        clearNotification,
        login,
        register,
        updateProfile,
        logout,
        forgotPassword,
        resetPassword,
        fetchLocations,
        fetchBookings,
        fetchEmployees,
        fetchLogs,
        createBooking,
        updateBookingStatus,
        rescheduleBooking,
        createEmployee,
        updateEmployee,
        deleteEmployee,
        createOwnerWithBusiness,
        updateLocationConfig,
        deleteLocation,
        adminCreateUser,
        adminUpdateUser,
        adminUsersList,
        fetchAdminUsers,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
