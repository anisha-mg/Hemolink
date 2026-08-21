import { PGlite } from '@electric-sql/pglite';
import { postgis } from '@electric-sql/pglite-postgis';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize PGlite in-memory database with PostGIS extension enabled
export const db = new PGlite({
  extensions: { postgis }
});

// Initialize Firebase Admin (optional / fallback resilient)
let firestore = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'hemo-link-a2802';
  const app = getApps().length > 0 ? getApp() : initializeApp({ projectId });
  firestore = getFirestore(app);
  console.log(`🔥 Firebase Admin SDK initialized for project: ${projectId}`);
} catch (e) {
  console.log('ℹ️ Firebase Cloud Firestore optional initialization skipped.');
}

export { firestore };

export async function initDB() {
  console.log('⚡ Initializing PostgreSQL database...');

  // 1. Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'requester', 'admin')),
      otp VARCHAR(10),
      otp_expiry TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1b. Registration OTPs Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS registration_otps (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      otp VARCHAR(10) NOT NULL,
      otp_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Donor Profiles Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS donor_profiles (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      blood_group VARCHAR(10) NOT NULL,
      dob DATE,
      gender VARCHAR(20),
      city VARCHAR(100),
      address TEXT,
      latitude NUMERIC(10, 8) NOT NULL,
      longitude NUMERIC(11, 8) NOT NULL,
      last_donation_date DATE,
      availability BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Requester Profiles Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requester_profiles (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      city VARCHAR(100),
      address TEXT,
      latitude NUMERIC(10, 8),
      longitude NUMERIC(11, 8),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Hospitals Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS hospitals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      city VARCHAR(100),
      address TEXT,
      latitude NUMERIC(10, 8),
      longitude NUMERIC(11, 8),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Blood Requests Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS blood_requests (
      id SERIAL PRIMARY KEY,
      requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      patient_name VARCHAR(255) NOT NULL,
      blood_group VARCHAR(10) NOT NULL,
      units_needed INT NOT NULL DEFAULT 1,
      hospital_name VARCHAR(255) NOT NULL,
      city VARCHAR(100),
      address TEXT,
      latitude NUMERIC(10, 8) NOT NULL,
      longitude NUMERIC(11, 8) NOT NULL,
      urgency VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent', 'critical')),
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE', 'DONOR_ARRIVED', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Matches Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      request_id INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
      donor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
      distance_km NUMERIC(6, 2),
      matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP WITH TIME ZONE
    );
  `);

  // 7. Donations Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      match_id INT REFERENCES matches(id) ON DELETE SET NULL,
      donor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      request_id INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
      donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      units_donated INT NOT NULL DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Notifications Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      payload JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Location Sessions Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS location_sessions (
      id SERIAL PRIMARY KEY,
      request_id INT UNIQUE NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
      donor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      active BOOLEAN DEFAULT TRUE,
      donor_lat NUMERIC(10, 8),
      donor_lng NUMERIC(11, 8),
      distance_km NUMERIC(6, 2),
      eta_minutes INT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ PostgreSQL database schema initialized successfully!');
}

// Spatial distance calculation (Haversine formula in SQL / meters to km)
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 100) / 100;
}
