import express from 'express';
import { db } from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications - User notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifsRes = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );

    const unreadRes = await db.query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );

    return res.json({
      success: true,
      unreadCount: parseInt(unreadRes.rows[0]?.unread_count || 0),
      notifications: notifsRes.rows
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    return res.json({ success: true, message: 'Notification marked read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// PATCH /api/notifications/read-all - Mark all as read
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );

    return res.json({ success: true, message: 'All notifications marked read' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

export default router;
