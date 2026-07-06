/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { uploadReceipt } from './server/upload.js';

import { Role, BookingStatus, User, UserWithPassword, CarWash, Booking, MapPreset } from './src/types.js';
import { 
  seedFirestoreIfEmpty,
  getUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCarWashes,
  getCarWashById,
  createCarWash,
  updateCarWash,
  deleteCarWash,
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  getBookingByTxnRef,
  getAuditLogs,
  addAuditLog,
  createPasswordReset,
  getPasswordResetByToken,
  deletePasswordReset,
  getMapPresets,
  createMapPreset,
  deleteMapPreset
} from './server/db.js';
import { 
  isSupabaseAuthEnabled, 
  registerSupabaseUser, 
  loginSupabaseUser, 
  sendSupabasePasswordReset 
} from './server/supabaseService.js';
import { authenticateToken, requireRoles, generateToken, AuthenticatedRequest } from './server/auth.js';
import { generateSlotsForDate } from './server/slots.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Body parsing middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Run database automatic seeding to populate Firestore on initial boot
  await seedFirestoreIfEmpty();

  // Helper function to calculate distance using Haversine formula (simulated maps distance filtering)
  function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // ==========================================
  // AUTH API ENDPOINTS
  // ==========================================

  // Register Customer
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, name, dateOfBirth, gender, profileImageUrl, address, phone } = req.body;

      if (!email || !password || !name) {
        res.status(400).json({ error: 'All fields (email, password, name) are required.' });
        return;
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        res.status(400).json({ error: 'Email already registered.' });
        return;
      }

      let userId = `usr_${Math.random().toString(36).substr(2, 9)}`;

      // Sync register with Supabase Auth if configured
      if (isSupabaseAuthEnabled) {
        try {
          const supabaseId = await registerSupabaseUser(email, password, name);
          if (supabaseId) {
            userId = supabaseId; // Match public User id to Supabase auth user id
          }
        } catch (supabaseError: any) {
          res.status(400).json({ error: `Supabase Auth Registration Failed: ${supabaseError.message}` });
          return;
        }
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const newUser: UserWithPassword = {
        id: userId,
        email: email.toLowerCase(),
        name,
        role: Role.CUSTOMER,
        isActive: true,
        passwordHash,
        createdAt: new Date().toISOString(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        profileImageUrl: profileImageUrl || undefined,
        address: address || undefined,
        phone: phone || undefined,
      };

      await createUser(newUser);

      await addAuditLog(newUser.id, newUser.email, 'USER_REGISTER', `Customer account created: ${newUser.name} ${isSupabaseAuthEnabled ? '(Supabase Auth Synchronized)' : ''}`);

      const { passwordHash: _, ...safeUser } = newUser;
      const token = generateToken(safeUser);

      res.status(201).json({ token, user: safeUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }

      const user = await getUserByEmail(email);

      if (!user) {
        res.status(400).json({ error: 'Invalid email or password.' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Your account is suspended. Please contact support.' });
        return;
      }

      // Authenticate via Supabase Auth if configured
      if (isSupabaseAuthEnabled) {
        try {
          const authSuccess = await loginSupabaseUser(email, password);
          if (!authSuccess) {
            res.status(400).json({ error: 'Invalid email or password.' });
            return;
          }
        } catch (supabaseError: any) {
          res.status(400).json({ error: `Supabase Auth Failed: ${supabaseError.message}` });
          return;
        }
      } else {
        // Fallback to standard local password validation
        const valid = bcrypt.compareSync(password, user.passwordHash);
        if (!valid) {
          res.status(400).json({ error: 'Invalid email or password.' });
          return;
        }
      }

      const { passwordHash: _, ...safeUser } = user;
      const token = generateToken(safeUser);

      await addAuditLog(user.id, user.email, 'USER_LOGIN', `User logged in: ${user.name} (${user.role}) ${isSupabaseAuthEnabled ? '(Supabase Auth Verified)' : ''}`);

      res.json({ token, user: safeUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Forgot Password (Request Code / Supabase Reset Link)
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Email address is required.' });
        return;
      }

      const user = await getUserByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'No account registered with this email address.' });
        return;
      }

      // If Supabase Auth is enabled, delegate the password reset email flow to Supabase
      if (isSupabaseAuthEnabled) {
        try {
          const host = req.get('host');
          const protocol = req.protocol;
          const redirectUrl = `${protocol}://${host}/reset-password`;

          await sendSupabasePasswordReset(email, redirectUrl);
          await addAuditLog(user.id, user.email, 'PASSWORD_RESET_REQUESTED', `Password reset link dispatched via Supabase Auth for ${user.email}`);

          res.json({
            message: 'A secure recovery link has been dispatched to your email address by Supabase Auth! Please click the link inside to set your new password.',
            isSupabase: true
          });
          return;
        } catch (supabaseError: any) {
          res.status(400).json({ error: `Supabase Auth Reset Failed: ${supabaseError.message}` });
          return;
        }
      }

      // Generate a secure 6-digit numeric verification code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

      await createPasswordReset(user.email, resetCode, expiresAt);

      // Print simulated email block to developer server logs
      console.log('========================================================');
      console.log('📬 [EMAIL SERVICE SIMULATOR - PASSWORD RESET]');
      console.log(`To: ${user.email}`);
      console.log(`Subject: Password Reset Verification Code - SudsFlow`);
      console.log(`Code: ${resetCode}`);
      console.log(`Expires: ${new Date(expiresAt).toLocaleTimeString()}`);
      console.log('========================================================');

      await addAuditLog(user.id, user.email, 'PASSWORD_RESET_REQUESTED', `Password reset token generated for ${user.email}`);

      // Return token in response for quick sandbox developer testing,
      // accompanied by a message indicating that in production this is sent via email APIs.
      res.json({
        message: 'A 6-digit verification code has been dispatched. For rapid sandbox testing, the code is supplied directly below.',
        sandboxCode: resetCode
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Reset Password (Verify & Commit)
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        res.status(400).json({ error: 'Verification code and new password are required.' });
        return;
      }

      const resetData = await getPasswordResetByToken(token);
      if (!resetData) {
        res.status(400).json({ error: 'Invalid or incorrect verification code.' });
        return;
      }

      if (new Date(resetData.expiresAt) < new Date()) {
        await deletePasswordReset(resetData.email);
        res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        return;
      }

      const user = await getUserByEmail(resetData.email);
      if (!user) {
        res.status(404).json({ error: 'User associated with this token was not found.' });
        return;
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // Update user password in the SQLite database
      await updateUser(user.id, { passwordHash });
      await deletePasswordReset(resetData.email);

      await addAuditLog(user.id, user.email, 'PASSWORD_RESET_SUCCESS', `Password reset successfully for ${user.email}`);

      res.json({ message: 'Your password has been successfully reset. You can now log in with your new password!' });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Get Me
  app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const user = await getUserById(req.user.id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Update Profile
  app.put('/api/auth/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const { name, phone, dateOfBirth, gender, profileImageUrl, address } = req.body;
      
      const updateData: Partial<UserWithPassword> = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
      if (gender !== undefined) updateData.gender = gender;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (address !== undefined) updateData.address = address;

      await updateUser(req.user.id, updateData);
      
      const updatedUser = await getUserById(req.user.id);
      if (!updatedUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await addAuditLog(req.user.id, req.user.email, 'USER_UPDATE_PROFILE', `User updated their own profile details: ${name}`);

      const { passwordHash: _, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // ==========================================
  // CAR WASH LOCATION ENDPOINTS
  // ==========================================

  // Public: List all active car washes (with optional search and location-based filtering)
  app.get('/api/car-washes', async (req, res) => {
    try {
      const allWashes = await getCarWashes();
      let locations = allWashes.filter((cw) => cw.isActive);

      const { search, lat, lng, radius } = req.query;

      if (search) {
        const q = (search as string).toLowerCase();
        locations = locations.filter(
          (cw) =>
            cw.name.toLowerCase().includes(q) ||
            cw.address.toLowerCase().includes(q) ||
            (cw.description && cw.description.toLowerCase().includes(q))
        );
      }

      if (lat && lng && radius) {
        const filterLat = parseFloat(lat as string);
        const filterLng = parseFloat(lng as string);
        const filterRad = parseFloat(radius as string); // in km

        if (!isNaN(filterLat) && !isNaN(filterLng) && !isNaN(filterRad)) {
          locations = locations.filter((cw) => {
            const distance = getDistanceInKm(filterLat, filterLng, cw.locationLat, cw.locationLng);
            return distance <= filterRad;
          });
        }
      }

      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Public: View single car wash
  app.get('/api/car-washes/:id', async (req, res) => {
    try {
      const carWash = await getCarWashById(req.params.id);
      if (!carWash) {
        res.status(404).json({ error: 'Car wash location not found.' });
        return;
      }
      res.json(carWash);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Manage: Create/Onboard new Car Wash location (Owner, Admin, or Special User)
  app.post(
    '/api/car-washes',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN, Role.SPECIAL]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { name, description, locationLat, locationLng, address, openingHours, slotDuration, capacityPerSlot, phone, instagram } = req.body;

        if (!name || !address || locationLat === undefined || locationLng === undefined) {
          res.status(400).json({ error: 'Fields (name, address, locationLat, locationLng) are required.' });
          return;
        }

        const ownerId = req.user!.role === Role.OWNER ? req.user!.id : (req.body.ownerId || req.user!.id);

        const newCarWash: CarWash = {
          id: `cw_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description: description || '',
          locationLat: parseFloat(locationLat),
          locationLng: parseFloat(locationLng),
          address,
          openingHours: openingHours || {
            monday: { open: '08:00', close: '18:00', isOpen: true },
            tuesday: { open: '08:00', close: '18:00', isOpen: true },
            wednesday: { open: '08:00', close: '18:00', isOpen: true },
            thursday: { open: '08:00', close: '18:00', isOpen: true },
            friday: { open: '08:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '17:00', isOpen: true },
            sunday: { open: '10:00', close: '16:00', isOpen: false },
          },
          slotDuration: parseInt(slotDuration) || 30,
          capacityPerSlot: parseInt(capacityPerSlot) || 1,
          ownerId,
          isActive: true,
          createdAt: new Date().toISOString(),
          phone: phone || '',
          instagram: instagram || '',
        };

        await createCarWash(newCarWash);

        await addAuditLog(req.user!.id, req.user!.email, 'CAR_WASH_CREATE', `Created location: ${newCarWash.name}`);

        res.status(201).json(newCarWash);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Manage: Update Car Wash location configuration (Owner of this business, Admin, or Special User)
  app.put(
    '/api/car-washes/:id',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN, Role.SPECIAL]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const carWash = await getCarWashById(req.params.id);

        if (!carWash) {
          res.status(404).json({ error: 'Car wash location not found.' });
          return;
        }

        // Authorization check: Only the actual owner, system admins, or special users can edit
        if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.SPECIAL && carWash.ownerId !== req.user!.id) {
          res.status(403).json({ error: 'You do not have permission to manage this car wash business.' });
          return;
        }

        const { 
          name, description, locationLat, locationLng, address, openingHours, 
          slotDuration, capacityPerSlot, isActive, phone, instagram,
          bibdAccountName, bibdAccountNo, bibdEnabled, bibdQrImageUrl,
          baiduriAccountName, baiduriAccountNo, baiduriEnabled, baiduriQrImageUrl,
          customPaymentsJson, paymentPolicy
        } = req.body;
 
        const updatedData: Partial<CarWash> = {
          name: name !== undefined ? name : carWash.name,
          description: description !== undefined ? description : carWash.description,
          locationLat: locationLat !== undefined ? parseFloat(locationLat) : carWash.locationLat,
          locationLng: locationLng !== undefined ? parseFloat(locationLng) : carWash.locationLng,
          address: address !== undefined ? address : carWash.address,
          openingHours: openingHours !== undefined ? openingHours : carWash.openingHours,
          slotDuration: slotDuration !== undefined ? parseInt(slotDuration) : carWash.slotDuration,
          capacityPerSlot: capacityPerSlot !== undefined ? parseInt(capacityPerSlot) : carWash.capacityPerSlot,
          isActive: isActive !== undefined ? !!isActive : carWash.isActive,
          phone: phone !== undefined ? phone : carWash.phone,
          instagram: instagram !== undefined ? instagram : carWash.instagram,
          bibdAccountName: bibdAccountName !== undefined ? bibdAccountName : carWash.bibdAccountName,
          bibdAccountNo: bibdAccountNo !== undefined ? bibdAccountNo : carWash.bibdAccountNo,
          bibdEnabled: bibdEnabled !== undefined ? !!bibdEnabled : carWash.bibdEnabled,
          bibdQrImageUrl: bibdQrImageUrl !== undefined ? bibdQrImageUrl : carWash.bibdQrImageUrl,
          baiduriAccountName: baiduriAccountName !== undefined ? baiduriAccountName : carWash.baiduriAccountName,
          baiduriAccountNo: baiduriAccountNo !== undefined ? baiduriAccountNo : carWash.baiduriAccountNo,
          baiduriEnabled: baiduriEnabled !== undefined ? !!baiduriEnabled : carWash.baiduriEnabled,
          baiduriQrImageUrl: baiduriQrImageUrl !== undefined ? baiduriQrImageUrl : carWash.baiduriQrImageUrl,
          customPaymentsJson: customPaymentsJson !== undefined ? customPaymentsJson : carWash.customPaymentsJson,
          paymentPolicy: paymentPolicy !== undefined ? paymentPolicy : carWash.paymentPolicy,
        };


        await updateCarWash(req.params.id, updatedData);
        await addAuditLog(req.user!.id, req.user!.email, 'CAR_WASH_UPDATE', `Updated configuration for location: ${carWash.name}`);

        res.json({ ...carWash, ...updatedData });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Manage: Delete Car Wash location (Owner of this business, Admin, or Special User)
  app.delete(
    '/api/car-washes/:id',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN, Role.SPECIAL]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const carWash = await getCarWashById(req.params.id);

        if (!carWash) {
          res.status(404).json({ error: 'Car wash location not found.' });
          return;
        }

        // Authorization check: Only the actual owner, system admins, or special users can delete
        if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.SPECIAL && carWash.ownerId !== req.user!.id) {
          res.status(403).json({ error: 'You do not have permission to delete this car wash business.' });
          return;
        }

        await deleteCarWash(req.params.id);
        await addAuditLog(req.user!.id, req.user!.email, 'CAR_WASH_DELETE', `Deleted location: ${carWash.name}`);

        res.json({ message: 'Car wash location successfully deleted.' });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // ==========================================
  // BOOKINGS AND SLOTS ENDPOINTS
  // ==========================================

  // Public: Dynamic available time slots generator for a given date
  app.get('/api/bookings/available-slots', async (req, res) => {
    try {
      const { carWashId, date } = req.query;

      if (!carWashId || !date) {
        res.status(400).json({ error: 'Parameters carWashId and date (YYYY-MM-DD) are required.' });
        return;
      }

      const carWash = await getCarWashById(carWashId as string);

      if (!carWash) {
        res.status(404).json({ error: 'Car wash location not found.' });
        return;
      }

      const allBookings = await getBookings();
      const slots = generateSlotsForDate(carWash, date as string, allBookings);
      res.json(slots);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Authenticated: View bookings list (filtered automatically by user role)
  app.get('/api/bookings', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const bookings = await getBookings();
      const carWashes = await getCarWashes();

      let bookingsList: Booking[] = [];

      if (user.role === Role.ADMIN) {
        bookingsList = bookings;
      } else if (user.role === Role.OWNER) {
        // Find car washes owned by this user
        const ownedIds = carWashes.filter((cw) => cw.ownerId === user.id).map((cw) => cw.id);
        bookingsList = bookings.filter((b) => ownedIds.includes(b.carWashId));
      } else if (user.role === Role.EMPLOYEE) {
        // Find bookings for the assigned businessId
        const employeeUser = await getUserById(user.id);
        if (employeeUser && employeeUser.businessId) {
          bookingsList = bookings.filter((b) => b.carWashId === employeeUser.businessId);
        } else {
          bookingsList = [];
        }
      } else {
        // Customer or Special User (customer view): only their own bookings
        bookingsList = bookings.filter((b) => b.customerId === user.id);
      }

      // Populate booking with car wash name and address for convenience in frontend
      const hydrated = bookingsList.map((b) => {
        const cw = carWashes.find((c) => c.id === b.carWashId);
        return {
          ...b,
          carWashName: cw ? cw.name : 'Unknown Car Wash',
          carWashAddress: cw ? cw.address : 'N/A',
          carWashPhone: cw ? cw.phone : '',
        };
      });

      // Sort with newest first
      hydrated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json(hydrated);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Authenticated: Book a slot (supports optional bank payment upload)
  app.post('/api/bookings', authenticateToken, (req: AuthenticatedRequest, res, next) => {
    uploadReceipt.single('receipt')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload error.' });
      }
      next();
    });
  }, async (req: AuthenticatedRequest, res) => {
    try {
      const { carWashId, date, timeSlot, notes, paymentBank, txnReference, serviceId, serviceName, price } = req.body;

      if (!carWashId || !date || !timeSlot) {
        res.status(400).json({ error: 'Fields (carWashId, date, timeSlot) are required.' });
        return;
      }

      const carWash = await getCarWashById(carWashId);

      if (!carWash) {
        res.status(404).json({ error: 'Car wash business not found.' });
        return;
      }

      if (!carWash.isActive) {
        res.status(400).json({ error: 'This car wash is temporarily offline.' });
        return;
      }

      // Check slot availability and capacity limits to prevent double bookings
      const allBookings = await getBookings();
      const slots = generateSlotsForDate(carWash, date, allBookings);
      const targetSlot = slots.find((s) => s.timeSlot === timeSlot);

      if (!targetSlot) {
        res.status(400).json({ error: 'Selected slot is outside of operating hours.' });
        return;
      }

      if (!targetSlot.isAvailable) {
        res.status(400).json({ error: 'This time slot is fully booked or no longer available.' });
        return;
      }

      // 🔒 Local Bank Payment Processing & Sanity Checks
      let dbPaymentBank: string | undefined = undefined;
      let dbTxnReference: string | undefined = undefined;
      let dbReceiptFilename: string | undefined = undefined;

      // Check if reference or payment bank is provided (indicating bank transfer flow)
      const policy: string = carWash.paymentPolicy || 'PAY_ON_SITE';
      if (policy === 'PRE_PAYMENT' && !paymentBank && !txnReference && !req.file) {
        res.status(400).json({ 
          error: 'This business requires upfront pre-payment. Payment bank selection, reference number, and receipt screenshot are all required to book.' 
        });
        return;
      }

      if (paymentBank || txnReference || req.file) {
        if (!paymentBank || !txnReference || !req.file) {
          res.status(400).json({ 
            error: 'For bank transfers, payment bank, reference number, and receipt screenshot are all required.' 
          });
          return;
        }

        // Aggressively sanitize / trim the reference number to prevent bypass fraud (e.g. trailing/leading spaces)
        const sanitizedRef = txnReference.toString().trim().toUpperCase();
        if (sanitizedRef.length === 0) {
          res.status(400).json({ error: 'Transaction reference number cannot be empty.' });
          return;
        }

        // Explicitly query the database for duplicate transaction references BEFORE running creation scripts
        const duplicateBooking = await getBookingByTxnRef(sanitizedRef);
        if (duplicateBooking) {
          res.status(400).json({ 
            error: 'This bank transaction reference number has already been used. Duplicate submissions are not allowed.' 
          });
          return;
        }

        dbPaymentBank = paymentBank;
        dbTxnReference = sanitizedRef;
        dbReceiptFilename = req.file.filename;
      }

      const newBooking: Booking = {
        id: `bk_${Math.random().toString(36).substr(2, 9)}`,
        carWashId,
        customerId: req.user!.id,
        customerName: req.user!.name,
        customerEmail: req.user!.email,
        date,
        timeSlot,
        status: BookingStatus.PENDING,
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paymentBank: dbPaymentBank,
        txnReference: dbTxnReference,
        receiptFilename: dbReceiptFilename,
        serviceId: serviceId || undefined,
        serviceName: serviceName || undefined,
        price: price ? parseFloat(price) : undefined,
      };

      await createBooking(newBooking);

      await addAuditLog(
        req.user!.id,
        req.user!.email,
        'BOOKING_CREATE',
        `Booked slot ${timeSlot} on ${date} at ${carWash.name}${dbTxnReference ? ` with bank payment ref: ${dbTxnReference}` : ''}`
      );

      res.status(201).json(newBooking);
    } catch (error: any) {
      console.error('Secure booking creation error details:', error);
      res.status(500).json({ error: 'An unexpected database error occurred. Your request could not be processed.' });
    }
  });

  // Authenticated: Reschedule or update a booking (customer can reschedule, owner/admin can reschedule)
  app.put('/api/bookings/:id/reschedule', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { date, timeSlot } = req.body;

      if (!date || !timeSlot) {
        res.status(400).json({ error: 'Fields (date, timeSlot) are required.' });
        return;
      }

      const booking = await getBookingById(req.params.id);

      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }

      const carWashes = await getCarWashes();
      const bookingsList = await getBookings();

      // Auth validation
      const isOwnerOrAdmin = req.user!.role === Role.ADMIN ||
        (req.user!.role === Role.OWNER && carWashes.some((cw) => cw.id === booking.carWashId && cw.ownerId === req.user!.id));
      const isCustomerSelf = req.user!.id === booking.customerId;

      if (!isOwnerOrAdmin && !isCustomerSelf) {
        res.status(403).json({ error: 'You are not authorized to reschedule this booking.' });
        return;
      }

      const carWash = carWashes.find((cw) => cw.id === booking.carWashId);
      if (!carWash) {
        res.status(404).json({ error: 'Car wash business not found.' });
        return;
      }

      // Check slot capacity on the new slot (exempting the current booking if it is the same slot)
      const slots = generateSlotsForDate(carWash, date, bookingsList.filter(b => b.id !== booking.id));
      const targetSlot = slots.find((s) => s.timeSlot === timeSlot);

      if (!targetSlot) {
        res.status(400).json({ error: 'Selected slot is outside of operating hours.' });
        return;
      }

      if (!targetSlot.isAvailable) {
        res.status(400).json({ error: 'New slot is fully booked.' });
        return;
      }

      const oldDate = booking.date;
      const oldSlot = booking.timeSlot;

      const updatedData = {
        date,
        timeSlot,
        status: BookingStatus.PENDING, // Reset status to pending when rescheduled
        updatedAt: new Date().toISOString(),
      };

      await updateBooking(booking.id, updatedData);

      await addAuditLog(
        req.user!.id,
        req.user!.email,
        'BOOKING_RESCHEDULE',
        `Rescheduled booking ${booking.id} from [${oldDate} ${oldSlot}] to [${date} ${timeSlot}]`
      );

      res.json({ ...booking, ...updatedData });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Authenticated: Change status (Accept, reject, check-in, complete, cancel)
  app.put('/api/bookings/:id/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status, notes, employeeId } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required.' });
        return;
      }

      const booking = await getBookingById(req.params.id);

      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }

      const user = req.user!;
      const carWashes = await getCarWashes();
      const users = await getUsers();

      const isCustomerSelf = user.id === booking.customerId;
      const isOwner = user.role === Role.OWNER && carWashes.some((cw) => cw.id === booking.carWashId && cw.ownerId === user.id);
      const isEmployeeAtBusiness = user.role === Role.EMPLOYEE && users.some((u) => u.id === user.id && u.businessId === booking.carWashId);
      const isAdmin = user.role === Role.ADMIN;

      if (status === BookingStatus.CANCELLED) {
        if (!isCustomerSelf && !isOwner && !isEmployeeAtBusiness && !isAdmin) {
          res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
          return;
        }
      } else {
        // Any other state (IN_PROGRESS, COMPLETED, REJECTED, etc.) requires staff access
        if (!isOwner && !isEmployeeAtBusiness && !isAdmin) {
          res.status(403).json({ error: 'Only staff can modify booking status to ' + status });
          return;
        }
      }

      const updatedData = {
        status: status as BookingStatus,
        notes: notes !== undefined ? notes : booking.notes,
        employeeId: employeeId !== undefined ? employeeId : (isEmployeeAtBusiness ? user.id : booking.employeeId),
        updatedAt: new Date().toISOString(),
      };

      await updateBooking(booking.id, updatedData);

      await addAuditLog(
        user.id,
        user.email,
        'BOOKING_STATUS_CHANGE',
        `Changed booking ${booking.id} status to ${status}. Details: ${notes || 'None'}`
      );

      res.json({ ...booking, ...updatedData });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // ==========================================
  // OWNER / BUSINESS MANAGE ENDPOINTS
  // ==========================================

  // List employees for owner business
  app.get(
    '/api/owner/employees',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.user!;
        const carWashes = await getCarWashes();
        const users = await getUsers();

        let employees: User[] = [];

        if (user.role === Role.ADMIN) {
          employees = users.filter((u) => u.role === Role.EMPLOYEE);
        } else {
          // Find car washes owned by this owner
          const ownedIds = carWashes.filter((cw) => cw.ownerId === user.id).map((cw) => cw.id);
          employees = users.filter((u) => u.role === Role.EMPLOYEE && u.businessId && ownedIds.includes(u.businessId));
        }

        const safeEmployees = employees.map(({ passwordHash: _, ...u }: any) => u);
        res.json(safeEmployees);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Add/Register employee under owner business
  app.post(
    '/api/owner/employees',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { email, password, name, businessId } = req.body;

        if (!email || !password || !name || !businessId) {
          res.status(400).json({ error: 'Fields (email, password, name, businessId) are required.' });
          return;
        }

        const carWashes = await getCarWashes();

        // Security check: If OWNER, verify they actually own the businessId
        if (req.user!.role === Role.OWNER) {
          const owned = carWashes.some((cw) => cw.id === businessId && cw.ownerId === req.user!.id);
          if (!owned) {
            res.status(403).json({ error: 'You do not own this business location.' });
            return;
          }
        }

        const existing = await getUserByEmail(email);
        if (existing) {
          res.status(400).json({ error: 'Email already exists.' });
          return;
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        const newEmployee: UserWithPassword = {
          id: `usr_${Math.random().toString(36).substr(2, 9)}`,
          email: email.toLowerCase(),
          name,
          role: Role.EMPLOYEE,
          isActive: true,
          businessId,
          passwordHash,
          createdAt: new Date().toISOString(),
        };

        await createUser(newEmployee);

        await addAuditLog(
          req.user!.id,
          req.user!.email,
          'EMPLOYEE_CREATE',
          `Created employee: ${newEmployee.name} for business: ${businessId}`
        );

        const { passwordHash: _, ...safeEmployee } = newEmployee;
        res.status(201).json(safeEmployee);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Update employee under owner business
  app.put(
    '/api/owner/employees/:id',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        const { name, email, businessId } = req.body;

        const targetUser = await getUserById(id);
        if (!targetUser || targetUser.role !== Role.EMPLOYEE) {
          res.status(404).json({ error: 'Employee not found.' });
          return;
        }

        const carWashes = await getCarWashes();

        // If OWNER, verify targetUser's current business and new businessId are owned by this owner
        if (req.user!.role === Role.OWNER) {
          const ownedIds = carWashes.filter((cw) => cw.ownerId === req.user!.id).map((cw) => cw.id);
          if (targetUser.businessId && !ownedIds.includes(targetUser.businessId)) {
            res.status(403).json({ error: 'You do not have access to this employee.' });
            return;
          }
          if (businessId && !ownedIds.includes(businessId)) {
            res.status(403).json({ error: 'You do not own the target business location.' });
            return;
          }
        }

        const updateData: Partial<User> = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();
        if (businessId) updateData.businessId = businessId;

        await updateUser(id, updateData);

        await addAuditLog(
          req.user!.id,
          req.user!.email,
          'EMPLOYEE_UPDATE',
          `Updated employee: ${targetUser.name} (${id})`
        );

        res.json({ success: true, message: 'Employee updated successfully.' });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Delete employee under owner business
  app.delete(
    '/api/owner/employees/:id',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;

        const targetUser = await getUserById(id);
        if (!targetUser || targetUser.role !== Role.EMPLOYEE) {
          res.status(404).json({ error: 'Employee not found.' });
          return;
        }

        const carWashes = await getCarWashes();

        // If OWNER, verify targetUser's business is owned by this owner
        if (req.user!.role === Role.OWNER) {
          const ownedIds = carWashes.filter((cw) => cw.ownerId === req.user!.id).map((cw) => cw.id);
          if (targetUser.businessId && !ownedIds.includes(targetUser.businessId)) {
            res.status(403).json({ error: 'You do not have access to this employee.' });
            return;
          }
        }

        await deleteUser(id);

        await addAuditLog(
          req.user!.id,
          req.user!.email,
          'EMPLOYEE_DELETE',
          `Deleted employee: ${targetUser.name} (${id})`
        );

        res.json({ success: true, message: 'Employee deleted successfully.' });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Owner specific audit logs
  app.get(
    '/api/owner/logs',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.user!;
        const logs = await getAuditLogs();
        
        if (user.role === Role.ADMIN) {
          res.json(logs);
          return;
        }

        const carWashes = await getCarWashes();
        const ownedNames = carWashes.filter((cw) => cw.ownerId === user.id).map((cw) => cw.name);
        const ownedIds = carWashes.filter((cw) => cw.ownerId === user.id).map((cw) => cw.id);

        const filteredLogs = logs.filter((log) => {
          if (log.userEmail === user.email || log.userId === user.id) return true;
          const matchesBusinessName = ownedNames.some((name) => log.details && log.details.includes(name));
          const matchesBusinessId = ownedIds.some((id) => log.details && log.details.includes(id));
          return matchesBusinessName || matchesBusinessId;
        });

        res.json(filteredLogs);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Basic Analytics Endpoint
  app.get(
    '/api/owner/analytics',
    authenticateToken,
    requireRoles([Role.OWNER, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const user = req.user!;
        const carWashes = await getCarWashes();
        const bookings = await getBookings();

        let myBusinessIds: string[] = [];

        if (user.role === Role.ADMIN) {
          myBusinessIds = carWashes.map((cw) => cw.id);
        } else {
          myBusinessIds = carWashes.filter((cw) => cw.ownerId === user.id).map((cw) => cw.id);
        }

        const myBookings = bookings.filter((b) => myBusinessIds.includes(b.carWashId));

        const completedBookings = myBookings.filter((b) => b.status === BookingStatus.COMPLETED);
        const pendingBookings = myBookings.filter((b) => b.status === BookingStatus.PENDING);
        const inProgressBookings = myBookings.filter((b) => b.status === BookingStatus.IN_PROGRESS);
        const cancelledBookings = myBookings.filter((b) => b.status === BookingStatus.CANCELLED);

        // Calculate simulated revenue (e.g., $40 average per wash)
        const estimatedRevenue = completedBookings.length * 45;

        // Group bookings by date to show history
        const bookingsByDate: { [date: string]: number } = {};
        myBookings.forEach((b) => {
          bookingsByDate[b.date] = (bookingsByDate[b.date] || 0) + 1;
        });

        res.json({
          totalBookings: myBookings.length,
          completedCount: completedBookings.length,
          pendingCount: pendingBookings.length,
          inProgressCount: inProgressBookings.length,
          cancelledCount: cancelledBookings.length,
          estimatedRevenue,
          bookingsByDate,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // ==========================================
  // SPECIAL USER ENDPOINTS
  // ==========================================

  // Special User Onboarding: Create Owner and Register Business
  app.post(
    '/api/special/create-owner',
    authenticateToken,
    requireRoles([Role.SPECIAL, Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { ownerEmail, ownerPassword, ownerName, businessName, businessAddress, businessLat, businessLng, businessDesc } = req.body;

        if (!ownerEmail || !ownerPassword || !ownerName || !businessName || !businessAddress) {
          res.status(400).json({ error: 'Missing required details for onboarding.' });
          return;
        }

        const existingUser = await getUserByEmail(ownerEmail);
        if (existingUser) {
          res.status(400).json({ error: 'Owner email already registered.' });
          return;
        }

        // 1. Create Owner User
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(ownerPassword, salt);
        const newOwner: UserWithPassword = {
          id: `usr_${Math.random().toString(36).substr(2, 9)}`,
          email: ownerEmail.toLowerCase(),
          name: ownerName,
          role: Role.OWNER,
          isActive: true,
          passwordHash,
          createdAt: new Date().toISOString(),
        };

        await createUser(newOwner);

        // 2. Register Business and link to newly created owner
        const newCarWash: CarWash = {
          id: `cw_${Math.random().toString(36).substr(2, 9)}`,
          name: businessName,
          description: businessDesc || 'Premium car wash business.',
          locationLat: parseFloat(businessLat) || 37.7749,
          locationLng: parseFloat(businessLng) || -122.4194,
          address: businessAddress,
          openingHours: {
            monday: { open: '08:00', close: '18:00', isOpen: true },
            tuesday: { open: '08:00', close: '18:00', isOpen: true },
            wednesday: { open: '08:00', close: '18:00', isOpen: true },
            thursday: { open: '08:00', close: '18:00', isOpen: true },
            friday: { open: '08:00', close: '18:00', isOpen: true },
            saturday: { open: '09:00', close: '17:00', isOpen: true },
            sunday: { open: '10:00', close: '16:00', isOpen: false },
          },
          slotDuration: 30,
          capacityPerSlot: 2,
          ownerId: newOwner.id,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        await createCarWash(newCarWash);

        await addAuditLog(
          req.user!.id,
          req.user!.email,
          'SPECIAL_ONBOARD_OWNER',
          `Special User onboarded Owner: ${ownerName} (${ownerEmail}) and business: ${businessName}`
        );

        const { passwordHash: _, ...safeOwner } = newOwner;
        res.status(201).json({ owner: safeOwner, carWash: newCarWash });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // ==========================================
  // MAP PRESETS ENDPOINTS
  // ==========================================

  // Public: Get all map presets
  app.get('/api/map-presets', async (req, res) => {
    try {
      const presets = await getMapPresets();
      res.json(presets);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // Admin: Create map preset
  app.post(
    '/api/admin/map-presets',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { name, lat, lng, country } = req.body;
        if (!name || lat === undefined || lng === undefined || !country) {
          res.status(400).json({ error: 'Fields (name, lat, lng, country) are required.' });
          return;
        }

        const preset: MapPreset = {
          id: `pre_${Math.random().toString(36).substr(2, 9)}`,
          name,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          country,
          isCustom: true,
          createdAt: new Date().toISOString()
        };

        await createMapPreset(preset);
        await addAuditLog(req.user!.id, req.user!.email, 'CREATE_MAP_PRESET', `Created map preset ${name} in ${country} at (${lat}, ${lng})`);
        res.status(201).json(preset);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Admin: Delete map preset
  app.delete(
    '/api/admin/map-presets/:id',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { id } = req.params;
        await deleteMapPreset(id);
        await addAuditLog(req.user!.id, req.user!.email, 'DELETE_MAP_PRESET', `Deleted map preset with ID ${id}`);
        res.json({ success: true, message: 'Map preset deleted successfully' });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // ==========================================
  // PLATFORM ADMIN ENDPOINTS
  // ==========================================

  // Admin: View all users
  app.get(
    '/api/admin/users',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const users = await getUsers();
        const safeUsers = users.map(({ passwordHash: _, ...u }) => u);
        res.json(safeUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Admin: Create any user
  app.post(
    '/api/admin/users',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { email, password, name, role, businessId } = req.body;

        if (!email || !password || !name || !role) {
          res.status(400).json({ error: 'Fields (email, password, name, role) are required.' });
          return;
        }

        const existing = await getUserByEmail(email);
        if (existing) {
          res.status(400).json({ error: 'Email already registered.' });
          return;
        }

        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync(password, salt);

        const newUser: UserWithPassword = {
          id: `usr_${Math.random().toString(36).substr(2, 9)}`,
          email: email.toLowerCase(),
          name,
          role: role as Role,
          isActive: true,
          businessId: role === Role.EMPLOYEE ? businessId : undefined,
          passwordHash,
          createdAt: new Date().toISOString(),
        };

        await createUser(newUser);

        await addAuditLog(req.user!.id, req.user!.email, 'ADMIN_USER_CREATE', `Admin created user ${name} with role ${role}`);

        const { passwordHash: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Admin: Update user role or status (active/suspended)
  app.put(
    '/api/admin/users/:id',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const targetUser = await getUserById(req.params.id);

        if (!targetUser) {
          res.status(404).json({ error: 'User not found.' });
          return;
        }

        // Prevent self modification of role or lock
        if (targetUser.id === req.user!.id) {
          res.status(400).json({ error: 'You cannot suspend or change your own admin account.' });
          return;
        }

        const { role, isActive, name, email, businessId } = req.body;

        const updatedData: Partial<UserWithPassword> = {
          role: role !== undefined ? (role as Role) : targetUser.role,
          isActive: isActive !== undefined ? !!isActive : targetUser.isActive,
          name: name !== undefined ? name : targetUser.name,
          email: email !== undefined ? email.toLowerCase() : targetUser.email,
          businessId: businessId !== undefined ? businessId : targetUser.businessId,
        };

        await updateUser(req.params.id, updatedData);

        await addAuditLog(
          req.user!.id,
          req.user!.email,
          'ADMIN_USER_UPDATE',
          `Admin updated user ${targetUser.email}. Status: [Active: ${isActive}], Role: [${role}]`
        );

        res.json({ ...targetUser, ...updatedData });
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Admin: View Audit Logs
  app.get(
    '/api/admin/logs',
    authenticateToken,
    requireRoles([Role.ADMIN]),
    async (req: AuthenticatedRequest, res) => {
      try {
        const logs = await getAuditLogs();
        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message || 'Internal server error' });
      }
    }
  );

  // Authenticated: Upload any image (e.g. business QR code images, logos, receipts)
  app.post('/api/upload', authenticateToken, (req: AuthenticatedRequest, res, next) => {
    uploadReceipt.single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || 'File upload error.' });
      }
      next();
    });
  }, (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded.' });
        return;
      }
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  // ==========================================
  // SERVE SECURE UPLOADS AND VITE SERVICES
  // ==========================================

  // Serve uploaded payment receipt screenshots securely
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset serving mounted from dist/');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Car Wash Booking Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
