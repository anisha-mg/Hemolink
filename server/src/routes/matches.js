import express from 'express';
import { db, calculateDistanceKm } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// POST /api/matches/:matchId/respond - Accept or Decline a match safely with transactions
router.post('/:matchId/respond', authenticateToken, requireRole('donor'), async (req, res) => {
  try {
    const matchId = req.params.matchId;
    const { action } = req.body; // 'ACCEPT' or 'DECLINE'

    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be ACCEPT or DECLINE' });
    }

    // Begin PostgreSQL Transaction
    await db.exec('BEGIN TRANSACTION;');

    // Lock match row FOR UPDATE to prevent race conditions
    const matchRes = await db.query(
      `SELECT m.*, br.requester_id, br.status as req_status, br.hospital_name, br.patient_name
       FROM matches m
       JOIN blood_requests br ON m.request_id = br.id
       WHERE m.id = $1 AND m.donor_id = $2
       FOR UPDATE`,
      [matchId, req.user.id]
    );

    if (matchRes.rows.length === 0) {
      await db.exec('ROLLBACK;');
      return res.status(404).json({ success: false, message: 'Match record not found' });
    }

    const match = matchRes.rows[0];

    if (match.status !== 'PENDING') {
      await db.exec('ROLLBACK;');
      return res.status(400).json({ success: false, message: `Match has already been ${match.status.toLowerCase()}` });
    }

    if (action === 'DECLINE') {
      await db.query(
        `UPDATE matches SET status = 'DECLINED', responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [matchId]
      );
      await db.exec('COMMIT;');
      return res.json({ success: true, message: 'Match declined successfully' });
    }

    // Check if another donor already accepted this blood request
    const existingAcceptedRes = await db.query(
      `SELECT id FROM matches WHERE request_id = $1 AND status = 'ACCEPTED'`,
      [match.request_id]
    );

    if (existingAcceptedRes.rows.length > 0) {
      // Mark this match as EXPIRED since request was already taken
      await db.query(
        `UPDATE matches SET status = 'EXPIRED', responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [matchId]
      );
      await db.exec('COMMIT;');
      return res.status(409).json({ success: false, message: 'Another donor has already accepted this emergency request' });
    }

    // Accept Match
    await db.query(
      `UPDATE matches SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [matchId]
    );

    // Update Blood Request Status to DONOR_ACCEPTED
    await db.query(
      `UPDATE blood_requests SET status = 'DONOR_ACCEPTED' WHERE id = $1`,
      [match.request_id]
    );

    // Expire other pending matches for this request
    await db.query(
      `UPDATE matches SET status = 'EXPIRED' WHERE request_id = $1 AND id != $2 AND status = 'PENDING'`,
      [match.request_id, matchId]
    );

    // Create active Location Session for real-time tracking
    // Fetch donor location
    const donorProfileRes = await db.query(
      `SELECT latitude, longitude, full_name FROM donor_profiles WHERE user_id = $1`,
      [req.user.id]
    );

    const donorProfile = donorProfileRes.rows[0] || {};
    const donorLat = donorProfile.latitude || 17.4374;
    const donorLng = donorProfile.longitude || 78.4482;

    await db.query(
      `INSERT INTO location_sessions (request_id, donor_id, requester_id, active, donor_lat, donor_lng, distance_km)
       VALUES ($1, $2, $3, TRUE, $4, $5, $6)
       ON CONFLICT (request_id) DO UPDATE 
       SET active = TRUE, donor_lat = EXCLUDED.donor_lat, donor_lng = EXCLUDED.donor_lng, updated_at = CURRENT_TIMESTAMP`,
      [match.request_id, req.user.id, match.requester_id, donorLat, donorLng, match.distance_km]
    );

    // Create Notification for Requester
    const notifRes = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        match.requester_id,
        'DONOR_ACCEPTED',
        'Donor Accepted Emergency Request!',
        `${donorProfile.full_name || 'A compatible donor'} accepted your blood request for ${match.patient_name} at ${match.hospital_name}. Live tracking is now active!`,
        JSON.stringify({ requestId: match.request_id, donorId: req.user.id })
      ]
    );

    // Commit Transaction
    await db.exec('COMMIT;');

    // Dispatch Socket.IO Real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${match.requester_id}`).emit('notification:new', notifRes.rows[0]);
      io.to(`request:${match.request_id}`).emit('match:accepted', {
        requestId: match.request_id,
        donorId: req.user.id,
        donorName: donorProfile.full_name,
        donorLat,
        donorLng
      });
    }

    return res.json({
      success: true,
      message: 'Match accepted! Live tracking session initiated.',
      requestId: match.request_id
    });

  } catch (err) {
    await db.exec('ROLLBACK;');
    console.error('Match response error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to process match response' });
  }
});

// GET /api/matches/my-matches - Donor fetch pending/accepted matches
router.get('/my-matches', authenticateToken, requireRole('donor'), async (req, res) => {
  try {
    // 1. Fetch donor profile location
    const donorRes = await db.query(
      `SELECT latitude, longitude FROM donor_profiles WHERE user_id = $1`,
      [req.user.id]
    );

    const donorLat = donorRes.rows[0]?.latitude ? parseFloat(donorRes.rows[0].latitude) : 17.4374;
    const donorLng = donorRes.rows[0]?.longitude ? parseFloat(donorRes.rows[0].longitude) : 78.4482;

    // 2. Fetch all active blood requests in the system
    const activeReqsRes = await db.query(
      `SELECT id, requester_id, patient_name, blood_group, units_needed, hospital_name, city, latitude, longitude, urgency, status 
       FROM blood_requests 
       WHERE status IN ('ACTIVE', 'MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE')`
    );

    // 3. For each active request, ensure a match record exists for this donor
    for (const reqRow of activeReqsRes.rows) {
      if (reqRow.requester_id === req.user.id) continue; // Don't match user to their own request

      const dist = calculateDistanceKm(donorLat, donorLng, parseFloat(reqRow.latitude), parseFloat(reqRow.longitude));

      const existingMatch = await db.query(
        `SELECT id FROM matches WHERE request_id = $1 AND donor_id = $2`,
        [reqRow.id, req.user.id]
      );

      if (existingMatch.rows.length === 0) {
        await db.query(
          `INSERT INTO matches (request_id, donor_id, status, distance_km) VALUES ($1, $2, 'PENDING', $3)`,
          [reqRow.id, req.user.id, dist]
        );
      }
    }

    // 4. Return all matches for donor
    const matchesRes = await db.query(
      `SELECT m.*, br.patient_name, br.blood_group, br.units_needed, br.hospital_name, br.city, br.urgency, br.status as request_status, br.latitude as req_lat, br.longitude as req_lng
       FROM matches m
       JOIN blood_requests br ON m.request_id = br.id
       WHERE m.donor_id = $1 AND br.status IN ('ACTIVE', 'MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE')
       ORDER BY m.matched_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      matches: matchesRes.rows
    });
  } catch (err) {
    console.error('Fetch matches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

export default router;
