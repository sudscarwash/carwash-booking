/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { apiRateLimiter, authRateLimiter } from '../middleware/rateLimiter.js';
import { verifyJWT, requireRoles, ProtectedRequest } from '../middleware/authMiddleware.js';
import { EmailService } from '../services/emailService.js';
import { ImageService } from '../services/imageService.js';

const router = express.Router();

/**
 * ============================================================================
 * 1. AUTHENTICATION & FORGOTTEN PASSWORD ENDPOINTS
 * ============================================================================
 */

/**
 * POST /api/v1/auth/forgot-password
 * Triggers a security verification code email with a password reset link
 */
router.post('/auth/forgot-password', authRateLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  try {
    // In production, locate the user record using Prisma:
    // const user = await prisma.user.findUnique({ where: { email } });
    
    // Simulate finding a user and generating a secure 1-hour verification token
    const mockUser = { id: 'usr-100', name: 'Alex Johnson', email };
    const resetToken = 'reset_' + Math.random().toString(36).substring(2, 15);

    // Save this code / token securely inside the database using Prisma:
    // await prisma.verificationCode.create({
    //   data: {
    //     userId: mockUser.id,
    //     code: hash(resetToken),
    //     type: 'PASSWORD_RESET',
    //     expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    //   }
    // });

    // Send the beautiful, secure transactional email
    await EmailService.sendPasswordResetEmail(
      mockUser.email, 
      mockUser.name, 
      resetToken
    );

    res.json({ 
      message: 'If the email exists in our system, a secure password reset link has been dispatched.' 
    });
  } catch (error: any) {
    console.error('[BlueprintAuth] Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error processing security request.' });
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Verifies a short-term 6-digit verification code
 */
router.post('/auth/verify-otp', authRateLimiter, async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400).json({ error: 'Email and verification code are required.' });
    return;
  }

  // Verification flow blueprint:
  // 1. Locate User in DB
  // 2. Query active code: prisma.verificationCode.findFirst({ where: { userId, type: 'EMAIL_VERIFICATION' } })
  // 3. Confirm expiration date (expiresAt > now)
  // 4. Update user active status
  res.json({ success: true, message: 'OTP verified successfully.' });
});


/**
 * ============================================================================
 * 2. SECURE IMAGE RESIZING & UPLOAD
 * ============================================================================
 */

/**
 * POST /api/v1/businesses/:id/images
 * Uploads, resizes, compresses, and registers a new image for a business.
 */
router.post(
  '/businesses/:id/images',
  apiRateLimiter,
  verifyJWT,
  requireRoles(['OWNER', 'ADMIN']),
  async (req: ProtectedRequest, res) => {
    const businessId = req.params.id;
    
    // In production, file upload is handled via multer middleware:
    // const rawFileBuffer = req.file?.buffer;
    // const originalMime = req.file?.mimetype;
    
    // Mock incoming file buffer for illustration
    const rawFileBuffer = Buffer.from('mock-image-data-payload-binary');
    const originalMime = 'image/jpeg';
    const originalName = 'showroom.jpg';

    try {
      // 1. Check existing image count using Prisma to respect the maximum upload constraint (e.g. 5)
      // const existingImagesCount = await prisma.image.count({ where: { carWashId: businessId } });
      const mockExistingCount = 2;
      await ImageService.validateUploadLimit(mockExistingCount, 1);

      // 2. Process image: Compress, resize, and convert to space-efficient WebP under 200KB
      const optimized = await ImageService.compressImage(rawFileBuffer, originalMime);

      // 3. Upload the high-quality, lightweight WebP buffer directly to S3 / Cloudflare R2
      const storageResult = await ImageService.uploadToStorage(
        optimized.buffer,
        originalName,
        optimized.mimeType,
        'car-wash-user-assets'
      );

      // 4. Save metadata record to database via Prisma:
      // const savedRecord = await prisma.image.create({
      //   data: {
      //     url: storageResult.url,
      //     key: storageResult.key,
      //     mimeType: optimized.mimeType,
      //     sizeBytes: optimized.sizeBytes,
      //     carWashId: businessId
      //   }
      // });

      res.status(201).json({
        message: 'Image optimized and uploaded successfully under 200KB threshold.',
        image: {
          url: storageResult.url,
          key: storageResult.key,
          size: `${(optimized.sizeBytes / 1024).toFixed(2)} KB`,
          format: optimized.mimeType
        }
      });
    } catch (error: any) {
      console.error('[BlueprintImage] Image processing failed:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export { router as productionBlueprintRouter };
