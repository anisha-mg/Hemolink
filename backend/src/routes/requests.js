import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { runMatchingEngine } from '../services/matchingEngine.js';

const router = express.Router();

// POST /api/requests - Create new emergency blood request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      patientName,
      bloodGroup,
      unitsNeeded,
      hospitalName,
      city,
      address,
      latitude,
      longitude,
      urgency,
      notes
    } = req.body;

    if (!patientName || !bloodGroup || !hospitalName || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'Missing required request parameters' });
    }

    // Ensure user record exists in database
    const userCheck = await db.query(`SELECT id FROM users WHERE id = $1`, [req.user.id]);
    if (userCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO users (id, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [req.user.id, req.user.email || `user_${req.user.id}@hemolink.org`, '9876543210', 'hash', req.user.role || 'requester']
      );
    }

    // Insert blood request into PostgreSQL
    const reqRes = await db.query(
      `INSERT INTO blood_requests 
       (requester_id, patient_name, blood_group, units_needed, hospital_name, city, address, latitude, longitude, urgency, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE', $11) RETURNING *`,
      [
        req.user.id,
        patientName.trim(),
        bloodGroup.trim().toUpperCase(),
        parseInt(unitsNeeded) || 1,
        hospitalName.trim(),
        city || 'Hyderabad',
        address || '',
        parseFloat(latitude),
        parseFloat(longitude),
        urgency || 'normal',
        notes || ''
      ]
    );

    const newRequest = reqRes.rows[0];
    const io = req.app.get('io');

    // Trigger REAL matching engine IMMEDIATELY (no cron or polling)
    const matchResult = await runMatchingEngine(newRequest.id, io);

    return res.status(201).json({
      success: true,
      message: 'Emergency request created successfully',
      request: newRequest,
      matchedDonorsCount: matchResult.matchedCount
    });

  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create blood request' });
  }
});

// GET /api/requests - List requests (Role aware / filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let requestsRes;
    if (req.user.role === 'requester') {
      // Requesters see their own created requests
      requestsRes = await db.query(
        `SELECT br.*, 
                (SELECT COUNT(*) FROM matches m WHERE m.request_id = br.id) as total_matches,
                (SELECT COUNT(*) FROM matches m WHERE m.request_id = br.id AND m.status = 'ACCEPTED') as accepted_matches
         FROM blood_requests br
         WHERE br.requester_id = $1
         ORDER BY br.created_at DESC`,
        [req.user.id]
      );
    } else if (req.user.role === 'donor') {
      // Donors see requests matched to them or active requests
      requestsRes = await db.query(
        `SELECT br.*, m.id as match_id, m.status as match_status, m.distance_km
         FROM blood_requests br
         JOIN matches m ON br.id = m.request_id
         WHERE m.donor_id = $1
         ORDER BY br.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Admin sees all
      requestsRes = await db.query(`SELECT * FROM blood_requests ORDER BY created_at DESC`);
    }

    return res.json({
      success: true,
      count: requestsRes.rows.length,
      requests: requestsRes.rows
    });
  } catch (err) {
    console.error('Fetch requests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
});

// GET /api/requests/:id - Fetch request details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const reqRes = await db.query(`SELECT * FROM blood_requests WHERE id = $1`, [requestId]);

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    const request = reqRes.rows[0];

    // Fetch accepted match details if any
    const acceptedMatchRes = await db.query(
      `SELECT m.*, dp.full_name as donor_name, dp.blood_group as donor_blood, u.phone as donor_phone
       FROM matches m
       JOIN donor_profiles dp ON m.donor_id = dp.user_id
       JOIN users u ON m.donor_id = u.id
       WHERE m.request_id = $1 AND m.status = 'ACCEPTED'`,
      [requestId]
    );

    // Fetch active location session if any
    const sessionRes = await db.query(
      `SELECT * FROM location_sessions WHERE request_id = $1 AND active = TRUE`,
      [requestId]
    );

    return res.json({
      success: true,
      request,
      acceptedMatch: acceptedMatchRes.rows[0] || null,
      locationSession: sessionRes.rows[0] || null
    });
  } catch (err) {
    console.error('Get request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch request details' });
  }
});

// PATCH /api/requests/:id/status - Enforce Request State Machine transitions
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;

    const VALID_STATUSES = ['ACTIVE', 'MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE', 'DONOR_ARRIVED', 'COMPLETED', 'CANCELLED'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    const reqRes = await db.query(`SELECT * FROM blood_requests WHERE id = $1`, [requestId]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const currentRequest = reqRes.rows[0];

    // Update status
    await db.query(`UPDATE blood_requests SET status = $1 WHERE id = $2`, [status, requestId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`request:${requestId}`).emit('request:statusUpdated', { requestId, status });
    }

    return res.json({
      success: true,
      requestId,
      previousStatus: currentRequest.status,
      newStatus: status
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update request status' });
  }
});

export default router;
