# Car Wash & Auto-Care Booking Platform (Brunei & Global)

Welcome to the **Car Wash & Auto-Care Booking Platform**! This repository is a high-performance, full-stack application built to deliver seamless, real-time car wash scheduling, map-based landmark searches, business configuration edits, and employee dispatch logs.

By default, the platform is configured as a robust, lightweight **mono-location service centered in Bandar Seri Begawan (BSB), Brunei**, powered by a local SQLite engine. However, the system is designed with extreme modularity, enabling instant transition to enterprise-grade cloud providers (Supabase, AWS, Cloudinary, Resend) and scaling to multi-location networks.

---

## Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [Express.js vs. NestJS: Comparative Breakdown](#expressjs-vs-nestjs-comparative-breakdown)
3. [Transitioning to Supabase (Cloud PostgreSQL & Auth)](#transitioning-to-supabase-cloud-postgresql--auth)
4. [Transitioning to AWS Ecosystem (RDS, Cognito, & SES)](#transitioning-to-aws-ecosystem-rds-cognito--ses)
5. [Standard PostgreSQL DDL Script](#standard-postgresql-ddl-script)
6. [Cloudinary Integration for Showcase Images](#cloudinary-integration-for-showcase-images)
7. [Resend Integration for Transactional Emails](#resend-integration-for-transactional-emails)
8. [Quick Start & Setup](#quick-start--setup)

---

## Tech Stack & Architecture

- **Frontend**: React 18 with TypeScript, Vite (bundling), Tailwind CSS (styling), Lucide-React (icons).
- **Backend**: Node.js with Express, tsx (Typescript execution), and esbuild (production bundling).
- **Database (Default)**: SQLite via `better-sqlite3` and Prisma Client for zero-config relational database queries.
- **Map System**: Fully interactive SVG map container supporting real-time user-location coordinates, custom click-pin placement, drag-and-pan controls, zooming, and a custom regex-based geocoding suggestions parser.

---

## Express.js vs. NestJS: Comparative Breakdown

Before migrating your backend, it is critical to understand how the current **Express.js (TypeScript)** setup compares to **NestJS**. Both run on Node.js but embody fundamentally different design philosophies.

| Feature / Aspect | Express.js + TypeScript (Current) | NestJS |
| :--- | :--- | :--- |
| **Architecture** | **Minimalist & Flexible**. No predefined structure; developers organize folders and layers as they see fit. | **Opinionated & Modular**. Highly structured using Angular-inspired modular patterns (`@Module`, `@Controller`, `@Injectable`). |
| **Dependency Injection** | Manual or none. Handled via standard ES Module imports. | **Native IoC Container**. Built-in decorator-driven Dependency Injection for class management. |
| **Learning Curve** | **Low**. Standard JavaScript patterns, easy for any Node developer to learn instantly. | **High**. Requires understanding OOP principles, TypeScript Decorators, Dependency Injection, and RxJS (optional). |
| **Boilerplate Code** | **Very low**. Small, lightweight endpoints written with minimal overhead. | **High**. Every new resource requires modular boilerplate (`module`, `controller`, `service`, `dto`). |
| **Performance** | **Extremely Fast**. Minimal abstraction layers mean faster cold starts and lower memory footprints. | **Slightly Slower**. The extra dependency container and bootstrap layers add a small startup and memory overhead. |
| **Ecosystem & Tools** | Pick-and-choose. Integrates with any database or library without wrapping. | **Rich & Unified**. Built-in CLI generators, native support for Microservices, WebSockets, GraphQL, and Swagger. |

### Advantages & Disadvantages for this Project

#### 🚀 Express.js (Current)
*   **Advantages**: 
    *   **Pristine Performance**: Boots in milliseconds in container environments like Google Cloud Run or AWS ECS.
    *   **Low Complexity**: Ideal for full-stack apps where Vite and Express coexist in a single, simple repository.
    *   **Rapid Iteration**: No need to generate files or modules when adding a new booking endpoint.
*   **Disadvantages**: 
    *   **Lacks Enforcement**: If multiple developers join, they must agree on a structure, or the backend can become disorganized over time.

#### 🛡️ NestJS
*   **Advantages**:
    *   **Enforced Consistency**: Ensures every developer writes controllers, guards, and services in the exact same format.
    *   **Enterprise-Ready Scaling**: Out-of-the-box support for API validation decorators (`class-validator`) and automatic OpenAPI/Swagger documentation.
*   **Disadvantages**:
    *   **Over-Engineering**: For a car wash booking system, NestJS adds significant architecture complexity. You would have to split single routes into separate Controller and Module files.
    *   **Build Size & Complexity**: Bundling NestJS with Vite inside a single production container is much more complex due to dynamic decorator metadata resolution at runtime.

---

## Transitioning to Supabase (Cloud PostgreSQL & Auth)

Supabase is an open-source Firebase alternative powered by PostgreSQL. It provides a real Postgres database, direct client-side querying capabilities, built-in User Authentication, and an automated SMTP transactional email delivery pipeline.

### 1. Database Connections
To use Supabase Postgres instead of SQLite, you only need to configure the connection string in your environment.

1. Create a project in [Supabase](https://supabase.com).
2. Go to **Database Settings** > **Connection string** > **URI** and copy the string.
3. Update `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.supabase.co:5432/postgres?sslmode=require"
   ```
4. Run your Prisma migration to push the schema to Supabase:
   ```bash
   npx prisma db push
   ```

### 2. Implementing Supabase Authentication & Client SDK
Instead of managing custom password hashing (`bcrypt`), JWT signatures (`jsonwebtoken`), and cookie-based sessions, you can let Supabase Auth handle it completely.

1. Install the Supabase JS Client:
   ```bash
   npm install @supabase/supabase-js
   ```
2. Initialize the Client (`src/lib/supabase.ts`):
   ```typescript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
3. Update User Sign-Up and Log-In (`src/context/AppContext.tsx`):
   ```typescript
   // Sign Up
   const { data, error } = await supabase.auth.signUp({
     email,
     password,
     options: {
       data: {
         name: name,
         role: 'CUSTOMER' // custom metadata
       }
     }
   });

   // Log In
   const { data, error } = await supabase.auth.signInWithPassword({
     email,
     password
   });
   ```

### 3. How Automatic Forgot Password Email Work
Supabase Auth automates the entire "Forgot Password" flow out of the box using secure redirect URLs and automated magic-link emails.

#### A. Triggering the Reset Email from React
```typescript
const handleForgotPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://your-carwash-app.com/reset-password',
  });
  if (error) throw error;
  showNotification("Password reset email sent!");
};
```

#### B. SMTP Setup (Custom Domains)
By default, Supabase sends emails from a shared testing server (limited to 3 emails per hour). For production, configure your own SMTP credentials in Supabase:
1. Navigate to your Supabase Dashboard > **Project Settings** > **Auth** > **SMTP Settings**.
2. Enable the **Custom SMTP** toggle.
3. Enter your SMTP details (e.g., using **Resend**, **Mailgun**, or **Amazon SES**):
   *   **Sender Email**: `bookings@yourdomain.com`
   *   **Host**: `smtp.resend.com` (if using Resend) or `email-smtp.us-east-1.amazonaws.com` (if using AWS SES)
   *   **Port**: `587`
   *   **Username & Password**: Provided by your SMTP provider.
4. Customize your email template in **Auth** > **Email Templates** > **Reset Password**.

---

## Transitioning to AWS Ecosystem (RDS, Cognito, & SES)

If you prefer to move entirely into Amazon Web Services (AWS), you can mirror the Supabase architecture using specialized serverless AWS services.

```
[ FRONTEND CLIENT ]             [ BACKEND SERVER ]             [ AWS INFRASTRUCTURE ]
React / Vite App      ======>   Express API           ======>  - AWS RDS (Postgres DB)
(S3 Static Web)       HTTPS     (ECS Fargate or        ======>  - AWS Cognito (User Auth)
                                Elastic Beanstalk)     ======>  - AWS SES (Forgot Password SMTP)
```

### 1. Database: AWS RDS (Relational Database Service)
To host your PostgreSQL database on AWS:
1. Open the **AWS RDS Console** and create a database.
2. Choose **PostgreSQL** as the engine (select the Free Tier or burstable instances for cost efficiency).
3. Set your master username and password.
4. Under **Connectivity**, enable **Publicly Accessible** if you need to run migrations locally, and configure security groups to allow traffic on port `5432`.
5. Retrieve the endpoint URL and construct your `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://[USERNAME]:[PASSWORD]@[RDS-ENDPOINT]:5432/[DB-NAME]?sslmode=require"
   ```
6. Deploy your schema to the RDS instance:
   ```bash
   npx prisma db push
   ```

### 2. User Auth: AWS Cognito User Pools
AWS Cognito handles secure signup, login, password recovery, and multi-factor authentication (MFA).

1. Open the **AWS Cognito Console** and create a **User Pool**.
2. Configure attributes: Choose **Email** as the primary sign-in attribute.
3. Set password strength policies and MFA preferences.
4. Create an **App Client** (disable client secret generation for standard web applications).
5. Integrate into React using the `@aws-amplify/auth` library:
   ```bash
   npm install aws-amplify
   ```
   ```typescript
   import { Amplify } from 'aws-amplify';
   import { signIn, signUp, resetPassword, confirmResetPassword } from 'aws-amplify/auth';

   Amplify.configure({
     Auth: {
       Cognito: {
         userPoolId: 'us-east-1_xxxxx',
         userPoolClientId: 'xxxxxxxxxxxxxx'
       }
     }
   });
   ```

### 3. Forgot Password Emails: AWS SES (Simple Email Service)
To trigger forgot password emails securely in Cognito or via custom Node backend:

1. Open the **AWS SES Console** and verify your domain (e.g., `yourdomain.com`).
2. Move your SES account out of the sandbox to enable sending to unverified external emails.
3. Link SES to Cognito:
   *   Go to your **Cognito User Pool** > **Messaging** tab.
   *   Under **Email**, select **Send email with Amazon SES**.
   *   Select your verified SES identity.
4. When a user clicks "Forgot Password" on your app, Cognito automatically dispatches a secure OTP or reset link using Amazon SES behind the scenes, completely automating the workflow.

---

## Standard PostgreSQL DDL Script

If you want to migrate or seed your database manually without using Prisma, execute this complete schema script directly inside your **Supabase SQL Editor** or **AWS RDS PostgreSQL client**:

```sql
-- Create custom Enums
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'EMPLOYEE', 'OWNER', 'SPECIAL', 'ADMIN');
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- Create User Table
CREATE TABLE "User" (
    "id" VARCHAR(100) PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" DEFAULT 'CUSTOMER' NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
    "businessId" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create CarWash Table
CREATE TABLE "CarWash" (
    "id" VARCHAR(100) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION NOT NULL,
    "locationLng" DOUBLE PRECISION NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "openingHours" JSONB NOT NULL,
    "slotDuration" INTEGER DEFAULT 30 NOT NULL,
    "capacityPerSlot" INTEGER DEFAULT 1 NOT NULL,
    "ownerId" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "bibdAccountName" VARCHAR(255),
    "bibdAccountNo" VARCHAR(255),
    "bibdEnabled" BOOLEAN DEFAULT FALSE NOT NULL,
    "bibdQrImageUrl" TEXT,
    "baiduriAccountName" VARCHAR(255),
    "baiduriAccountNo" VARCHAR(255),
    "baiduriEnabled" BOOLEAN DEFAULT FALSE NOT NULL,
    "baiduriQrImageUrl" TEXT,
    "customPaymentsJson" TEXT,
    "paymentPolicy" VARCHAR(50) DEFAULT 'PRE_PAYMENT' NOT NULL,
    CONSTRAINT "fk_car_wash_owner" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create Booking Table
CREATE TABLE "Booking" (
    "id" VARCHAR(100) PRIMARY KEY,
    "carWashId" VARCHAR(100) NOT NULL,
    "customerId" VARCHAR(100) NOT NULL,
    "customerName" VARCHAR(255) NOT NULL,
    "customerEmail" VARCHAR(255) NOT NULL,
    "date" VARCHAR(50) NOT NULL,
    "timeSlot" VARCHAR(100) NOT NULL,
    "status" "BookingStatus" DEFAULT 'PENDING' NOT NULL,
    "notes" TEXT,
    "paymentBank" VARCHAR(100),
    "txnReference" VARCHAR(255) UNIQUE,
    "receiptFilename" VARCHAR(255),
    "employeeId" VARCHAR(100),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "fk_booking_car_wash" FOREIGN KEY ("carWashId") REFERENCES "CarWash"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_booking_customer" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_booking_employee" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL,
    CONSTRAINT "uq_booking_slot" UNIQUE ("carWashId", "date", "timeSlot", "customerId")
);

-- Create Image Table
CREATE TABLE "Image" (
    "id" VARCHAR(100) PRIMARY KEY,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "carWashId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "fk_image_car_wash" FOREIGN KEY ("carWashId") REFERENCES "CarWash"("id") ON DELETE CASCADE
);

-- Create VerificationCode Table
CREATE TABLE "VerificationCode" (
    "id" VARCHAR(100) PRIMARY KEY,
    "userId" VARCHAR(100) NOT NULL,
    "code" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "fk_verification_user" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create AuditLog Table
CREATE TABLE "AuditLog" (
    "id" VARCHAR(100) PRIMARY KEY,
    "userId" VARCHAR(100) NOT NULL,
    "userEmail" VARCHAR(255) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" VARCHAR(50),
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "fk_audit_user" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Add optimized Indexes
CREATE INDEX "idx_user_email" ON "User"("email");
CREATE INDEX "idx_carwash_owner" ON "CarWash"("ownerId");
CREATE INDEX "idx_booking_carwash_date" ON "Booking"("carWashId", "date");
CREATE INDEX "idx_booking_customer" ON "Booking"("customerId");
CREATE INDEX "idx_booking_employee" ON "Booking"("employeeId");
CREATE INDEX "idx_image_carwash" ON "Image"("carWashId");
CREATE INDEX "idx_verification_user" ON "VerificationCode"("userId");
CREATE INDEX "idx_audit_user" ON "AuditLog"("userId");
CREATE INDEX "idx_audit_timestamp" ON "AuditLog"("timestamp");
```

---

## Cloudinary Integration for Showcase Images

To support photo uploads of vehicle condition records, booking confirmations, or staff profiles:

1. **Get Cloudinary Credentials**:
   * Sign up for a free account on [Cloudinary](https://cloudinary.com).
   * Retrieve your Cloud Name, API Key, and API Secret from your dashboard.

2. **Add Variables to `.env`**:
   ```env
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   ```

3. **Server Controller Setup**:
   Configure a backend endpoint using the `@cloudinary/url-gen` or `cloudinary` SDK to secure-upload file assets directly from the frontend:
   ```typescript
   import { v2 as cloudinary } from 'cloudinary';
   
   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET
   });
   
   app.post('/api/upload', async (req, res) => {
     const uploadResponse = await cloudinary.uploader.upload(req.body.image, {
       upload_preset: 'carwash_preset',
     });
     res.json({ url: uploadResponse.secure_url });
   });
   ```

---

## Resend Integration for Transactional Emails

To send automated transactional emails when a booking is confirmed, rescheduled, or cancelled:

1. **Acquire API Key**:
   * Register at [Resend](https://resend.com) and verify your business domain.
   * Generate an API Token.

2. **Add Variables to `.env`**:
   ```env
   RESEND_API_KEY="re_abcdef12345"
   EMAIL_FROM_ADDRESS="no-reply@yourdomain.com"
   ```

3. **Backend Integration**:
   Install the `@resend/node` library:
   ```bash
   npm install resend
   ```
   Add email dispatches within your booking handlers in `server.ts`:
   ```typescript
   import { Resend } from 'resend';
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   await resend.emails.send({
     from: process.env.EMAIL_FROM_ADDRESS,
     to: customerEmail,
     subject: 'Booking Confirmed - Brunei Royal Auto Spa',
     html: `<strong>Hello ${customerName},</strong><p>Your wash reservation is scheduled for ${date} during ${timeSlot}.</p>`
   });
   ```

---

## Quick Start & Setup

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the environment template to your local `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in any API keys or credentials. If no database variables are provided, the app automatically falls back to local SQLite stored securely in `data/carwash.db`.

### 3. Run Development Server
Boot both Vite's client and the backend Express proxy on port `3000`:
```bash
npm run dev
```

### 4. Build for Production
Bundle the server and client assets inside the `dist/` directory:
```bash
npm run build
```

