import { db, calculateDistanceKm } from '../config/db.js';
import { isCompatibleDonor, isDonorInCooldown } from '../utils/compatibility.js';

const URGENCY_RADIUS_KM = {
  critical: 30,
  urgent: 20,
  normal: 10
};

export async function runMatchingEngine(requestId, io) {
  console.log(`🚑 Running immediate matching engine for Request #${requestId}...`);
  
  // 1. Fetch Blood Request details from DB
  const reqRes = await db.query(
    `SELECT id, requester_id, patient_name, blood_group, units_needed, hospital_name, city, latitude, longitude, urgency, status 
     FROM blood_requests WHERE id = $1`,
    [requestId]
  );
  
  if (reqRes.rows.length === 0) {
    console.error(`❌ Request #${requestId} not found during matching`);
    return { success: false, matchedCount: 0 };
  }
  
  const request = reqRes.rows[0];
  const maxRadius = URGENCY_RADIUS_KM[request.urgency.toLowerCase()] || 15;
  
  // 2. Query all active donors from DB (both available and unavailable/in cooldown)
  const donorsRes = await db.query(
    `SELECT dp.id as profile_id, dp.user_id, dp.full_name, dp.blood_group, dp.latitude, dp.longitude, dp.availability, dp.last_donation_date, u.email, u.phone 
     FROM donor_profiles dp
     JOIN users u ON dp.user_id = u.id`
  );
  
  const eligibleDonors = [];
  
  for (const donor of donorsRes.rows) {
    // Exclude requester if they are also registered as donor
    if (donor.user_id === request.requester_id) continue;
    
    // Check blood compatibility
    if (!isCompatibleDonor(donor.blood_group, request.blood_group)) continue;
    
    // Calculate real distance
    const dist = calculateDistanceKm(
      parseFloat(request.latitude),
      parseFloat(request.longitude),
      parseFloat(donor.latitude),
      parseFloat(donor.longitude)
    );
    
    // Check if donor is within the urgency radius
    if (dist <= maxRadius) {
      eligibleDonors.push({
        ...donor,
        distance_km: dist,
        inCooldown: isDonorInCooldown(donor.last_donation_date)
      });
    }
  }
  
  // Sort donors by distance (nearest first)
  eligibleDonors.sort((a, b) => a.distance_km - b.distance_km);
  
  console.log(`🎯 Found ${eligibleDonors.length} compatible donor(s) within ${maxRadius}km for Request #${requestId}`);
  
  const matchRecords = [];
  
  for (const donor of eligibleDonors) {
    // Check if match already exists
    const existingMatch = await db.query(
      `SELECT id FROM matches WHERE request_id = $1 AND donor_id = $2`,
      [requestId, donor.user_id]
    );
    
    if (existingMatch.rows.length === 0) {
      // Insert Match Record
      const matchRes = await db.query(
        `INSERT INTO matches (request_id, donor_id, status, distance_km) 
         VALUES ($1, $2, 'PENDING', $3) RETURNING *`,
        [requestId, donor.user_id, donor.distance_km]
      );
      
      const match = matchRes.rows[0];
      
      // Create Persistent Notification in DB
      const notifRes = await db.query(
        `INSERT INTO notifications (user_id, type, title, message, payload) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          donor.user_id,
          'EMERGENCY_MATCH',
          'Urgent Blood Request Nearby',
          `Emergency ${request.blood_group} request at ${request.hospital_name} (${donor.distance_km} km away)`,
          JSON.stringify({ requestId: request.id, matchId: match.id, distanceKm: donor.distance_km, hospital: request.hospital_name })
        ]
      );
      
      matchRecords.push(match);
      
      // Dispatch Real-Time Socket.IO event to Donor's private room
      if (io) {
        io.to(`user:${donor.user_id}`).emit('notification:new', notifRes.rows[0]);
        io.to(`user:${donor.user_id}`).emit('match:new', {
          matchId: match.id,
          requestId: request.id,
          patientName: request.patient_name,
          bloodGroup: request.blood_group,
          unitsNeeded: request.units_needed,
          hospitalName: request.hospital_name,
          urgency: request.urgency,
          distanceKm: donor.distance_km
        });
      }
    }
  }
  
  // Update request status to MATCHED if donors were found
  if (matchRecords.length > 0) {
    await db.query(
      `UPDATE blood_requests SET status = 'MATCHED' WHERE id = $1 AND status = 'ACTIVE'`,
      [requestId]
    );
  }
  
  return {
    success: true,
    matchedCount: matchRecords.length,
    matches: matchRecords
  };
}
