import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/donations - Mark donation completed
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { requestId, matchId, unitsDonated, notes } = req.body;

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    // Fetch Request details
    const reqRes = await db.query(`SELECT * FROM blood_requests WHERE id = $1`, [requestId]);
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }
    const request = reqRes.rows[0];

    // Find accepted match for this request
    const matchRes = await db.query(
      `SELECT * FROM matches WHERE request_id = $1 AND status = 'ACCEPTED'`,
      [requestId]
    );

    if (matchRes.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No accepted donor found for this request' });
    }

    const match = matchRes.rows[0];
    const donorId = match.donor_id;

    // Begin PostgreSQL Transaction
    await db.exec('BEGIN TRANSACTION;');

    // 1. Insert Donation Record
    const donationRes = await db.query(
      `INSERT INTO donations (match_id, donor_id, request_id, donation_date, units_donated, notes)
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5) RETURNING *`,
      [match.id, donorId, requestId, parseInt(unitsDonated) || request.units_needed || 1, notes || 'Completed successfully']
    );

    // 2. Update Donor's last_donation_date & enforce 90-day cooldown server-side
    const todayStr = new Date().toISOString().split('T')[0];
    await db.query(
      `UPDATE donor_profiles 
       SET last_donation_date = $1, availability = FALSE 
       WHERE user_id = $2`,
      [todayStr, donorId]
    );

    // 3. Deactivate Location Tracking Session
    await db.query(
      `UPDATE location_sessions SET active = FALSE WHERE request_id = $1`,
      [requestId]
    );

    // 4. Update Request Status to COMPLETED
    await db.query(
      `UPDATE blood_requests SET status = 'COMPLETED' WHERE id = $1`,
      [requestId]
    );

    // 5. Create Persistent Notifications
    const reqNotif = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        request.requester_id,
        'DONATION_COMPLETED',
        'Emergency Request Fulfilled!',
        `Your emergency blood request for ${request.patient_name} at ${request.hospital_name} has been completed. Thank you for using HemoLink!`,
        JSON.stringify({ requestId, donationId: donationRes.rows[0].id })
      ]
    );

    const donorNotif = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        donorId,
        'DONATION_COMPLETED',
        'Donation Completed - Thank You!',
        `Your noble blood donation has saved a life! Your 90-day cooldown period has been initiated.`,
        JSON.stringify({ requestId, donationId: donationRes.rows[0].id })
      ]
    );

    await db.exec('COMMIT;');

    // Dispatch Socket.IO events
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${request.requester_id}`).emit('notification:new', reqNotif.rows[0]);
      io.to(`user:${donorId}`).emit('notification:new', donorNotif.rows[0]);
      io.to(`request:${requestId}`).emit('request:completed', { requestId, donationId: donationRes.rows[0].id });
    }

    return res.status(201).json({
      success: true,
      message: 'Donation recorded successfully! Request marked completed and 90-day cooldown enforced.',
      donation: donationRes.rows[0]
    });

  } catch (err) {
    await db.exec('ROLLBACK;');
    console.error('Donation error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to complete donation' });
  }
});

// GET /api/donations/my-donations - Fetch donor donation history
router.get('/my-donations', authenticateToken, async (req, res) => {
  try {
    const donationsRes = await db.query(
      `SELECT d.id, d.donation_date, d.units_donated, d.notes, d.created_at,
              br.patient_name, br.blood_group, br.hospital_name, br.city, br.address
       FROM donations d
       JOIN blood_requests br ON d.request_id = br.id
       WHERE d.donor_id = $1
       ORDER BY d.created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      donations: donationsRes.rows
    });
  } catch (err) {
    console.error('Fetch my-donations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch donations history' });
  }
});

export default router;
