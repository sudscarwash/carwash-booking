# Cloud Database Migration Guide (Firebase, Supabase, Google Cloud SQL, AWS RDS)

This guide documents the architectural separation of our application, our environment variable strategy, and a clean migration path to help you deploy to any major cloud database (such as **Firebase**, **Supabase**, **Google Cloud SQL**, or **AWS RDS**).

---

## 1. Architectural Blueprint: Frontend vs. Backend

Your application utilizes a unified high-performance full-stack pattern:

```
[ FRONTEND CLIENT ]                    [ BACKEND SERVER ]                 [ DATABASE LAYER ]
Vite (React + Tailwind)  =======>  Express API (server.ts)  =======>  SQLite (Development)
(Runs in user's browser)    HTTP   (Runs on Cloud Run/Container)      Firestore / Supabase (Prod)
                            JSON
```

*   **Vite (`/src/` folder)**: Serves the **Frontend User Interface**. It compiles React components, custom layout styles, and assets. The browser runs this code directly.
*   **Express (`/server.ts` and `/server/` files)**: Serves the **Backend API**. It handles operations requiring security, such as password hashing (`bcrypt`), JWT authentication, audit log creation, and slot scheduling logic. 
*   **Database Engine**: The database is fully abstracted. The backend queries data and returns structured JSON responses, allowing you to swap out SQLite for Firebase, Supabase, or AWS seamlessly without rewriting the frontend.

---

## 2. Environment Variables & Security (`.env` vs `.env.example`)

To secure database credentials, connection strings, or API secrets:

1.  **Never expose secrets to the browser**: Standard variables loaded in Vite (prefixed with `VITE_`) are compiled into client code and visible in DevTools. 
2.  **Server-Only variables**: Database connection strings (`DATABASE_URL`), JWT Secrets (`JWT_SECRET`), or cloud credentials (`FIREBASE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) should **only** exist in your server environment (accessed via `process.env`). They remain strictly server-side, preventing unauthorized access.

---

## 3. Database Schemas: How Businesses and Owners are Connected

To model the **System Marketplace Directory** where **Businesses (`car_washes`)** and **Owners (`users` with `role = 'OWNER'`)** are linked, we enforce a relational binding:

*   Each user profile has a unique identifier (`id`).
*   Each business location has an `ownerId` foreign key referencing the user's `id`.

Below are the exact implementation blueprints for both Firestore (Document Store) and PostgreSQL (Supabase, Google Cloud SQL, AWS RDS).

### Option A: Firebase / Firestore Structure

Firestore is a document-oriented database. To connect owners and businesses, you create two primary collections: `users` and `car_washes`.

#### 1. `users` Collection Document Schema:
```json
// Collection: users
// Document ID: "usr_9z1k82m0p"
{
  "name": "Jack Owner",
  "email": "owner@carwash.com",
  "role": "OWNER",
  "isActive": true,
  "createdAt": "2026-06-29T11:00:00Z"
}
```

#### 2. `car_washes` Collection Document Schema:
```json
// Collection: car_washes
// Document ID: "cw_a3k2j1m90"
{
  "name": "Downtown Crystal Clean",
  "address": "455 Market St, San Francisco, CA",
  "description": "Premium car wash and detailing facility.",
  "locationLat": 37.7749,
  "locationLng": -122.4194,
  "ownerId": "usr_9z1k82m0p", // <--- CONNECTED: Points directly to the Owner's user ID
  "slotDuration": 30,
  "capacityPerSlot": 2,
  "isActive": true,
  "createdAt": "2026-06-29T11:00:00.000Z"
}
```

#### 3. Firestore Connection Query Example (Node.js SDK):
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const db = getFirestore(initializeApp({ /* Config */ }));

// Fetch all business locations owned by a specific merchant
export async function getOwnedBusinesses(ownerId: string) {
  const washesRef = collection(db, 'car_washes');
  const q = query(washesRef, where('ownerId', '==', ownerId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

---

### Option B: Supabase / PostgreSQL Structure (Google Cloud SQL, AWS RDS)

PostgreSQL is a relational database. It is highly robust, supports strong schemas, and is standard across **Supabase**, **Google Cloud SQL**, and **AWS RDS (PostgreSQL)**.

#### 1. DDL Migration SQL Script (Run this in your database console):
```sql
-- 1. Create Roles Enum
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'OWNER', 'EMPLOYEE', 'SPECIAL', 'ADMIN');
CREATE TYPE booking_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- 2. Create Users Table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'CUSTOMER',
    is_active BOOLEAN DEFAULT TRUE,
    business_id VARCHAR(50), -- Used for Operators/Employees assigned to a specific facility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Car Washes Table
CREATE TABLE car_washes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    location_lat DECIMAL(9,6) NOT NULL,
    location_lng DECIMAL(9,6) NOT NULL,
    slot_duration INT DEFAULT 30,
    capacity_per_slot INT DEFAULT 1,
    owner_id VARCHAR(50) NOT NULL, -- <--- CONNECTED
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_owner FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add Index for geographical/search optimizations
CREATE INDEX idx_car_washes_owner ON car_washes(owner_id);
```

#### 2. PostgreSQL Connection Query Example (Node pg SDK / Supabase API):
```typescript
import pg from 'pg';
const { Pool } = pg;

// Connection string supplied by Supabase, GCP, or AWS via .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
});

// Connected Business-Owner Query using standard SQL JOIN
export async function getBusinessWithOwnerDetails(carWashId: string) {
  const queryText = `
    SELECT cw.*, u.name as owner_name, u.email as owner_email
    FROM car_washes cw
    JOIN users u ON cw.owner_id = u.id
    WHERE cw.id = $1
  `;
  const res = await pool.query(queryText, [carWashId]);
  return res.rows[0] || null;
}
```

---

## 4. Diagnostics & Easy Future Error Tracing

When deploying to production, follow this modular hierarchy to isolate errors rapidly:

1.  **Database Connection Verification**: If the app fails to start, isolate whether the connection string is valid. Add a startup check in your server:
    ```typescript
    // In server startup
    pool.query('SELECT NOW()')
      .then(() => console.log('✅ Database connected successfully!'))
      .catch((err) => console.error('❌ Database connection failed:', err.message));
    ```
2.  **Inspect REST Request Flow**: If the UI hangs, look at the **Network Tab** in the browser DevTools:
    *   `401 Unauthorized` → JWT expired or auth headers are missing.
    *   `403 Forbidden` → User is trying to access a business they do not own.
    *   `500 Internal Error` → Check the server terminal logs to locate DB syntax errors or schema mismatches.
3.  **Audit Logging**: Continue utilizing the `addAuditLog` server utility. Any critical action (e.g. `CAR_WASH_CREATE`, `SPECIAL_ONBOARD_OWNER`) writes a persistent entry into the audit logs table, making troubleshooting user disputes incredibly straightforward.
