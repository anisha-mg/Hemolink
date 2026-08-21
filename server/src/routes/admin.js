import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /api/admin/stats - Every statistic comes from a real PostgreSQL SQL query (SELECT COUNT(*)...)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Total users count
    const totalUsersRes = await db.query(`SELECT COUNT(*) as count FROM users`);
    
    // 2. Donor counts (total & available)
    const totalDonorsRes = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'donor'`);
    const availDonorsRes = await db.query(`SELECT COUNT(*) as count FROM donor_profiles WHERE availability = TRUE`);
    
    // 3. Requester count
    const totalRequestersRes = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'requester'`);
    
    // 4. Request counts (total & completed)
    const totalRequestsRes = await db.query(`SELECT COUNT(*) as count FROM blood_requests`);
    const completedRequestsRes = await db.query(`SELECT COUNT(*) as count FROM blood_requests WHERE status = 'COMPLETED'`);
    const activeRequestsRes = await db.query(`SELECT COUNT(*) as count FROM blood_requests WHERE status IN ('ACTIVE', 'MATCHED', 'DONOR_ACCEPTED', 'DONOR_EN_ROUTE')`);
    
    // 5. Total donations count
    const totalDonationsRes = await db.query(`SELECT COUNT(*) as count FROM donations`);
    
    // 6. Blood group breakdown for donors
    const bgRes = await db.query(
      `SELECT blood_group, COUNT(*) as count FROM donor_profiles GROUP BY blood_group ORDER BY blood_group`
    );
    
    // 7. Recent activity from blood_requests
    const recentRequestsRes = await db.query(
      `SELECT br.id, br.patient_name, br.blood_group, br.hospital_name, br.urgency, br.status, br.created_at
       FROM blood_requests br
       ORDER BY br.created_at DESC LIMIT 10`
    );

    return res.json({
      success: true,
      stats: {
        totalUsers: parseInt(totalUsersRes.rows[0]?.count || 0),
        totalDonors: parseInt(totalDonorsRes.rows[0]?.count || 0),
        availableDonors: parseInt(availDonorsRes.rows[0]?.count || 0),
        totalRequesters: parseInt(totalRequestersRes.rows[0]?.count || 0),
        totalRequests: parseInt(totalRequestsRes.rows[0]?.count || 0),
        activeRequests: parseInt(activeRequestsRes.rows[0]?.count || 0),
        completedRequests: parseInt(completedRequestsRes.rows[0]?.count || 0),
        totalDonations: parseInt(totalDonationsRes.rows[0]?.count || 0)
      },
      bloodGroupDistribution: bgRes.rows,
      recentRequests: recentRequestsRes.rows
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

export default router;
