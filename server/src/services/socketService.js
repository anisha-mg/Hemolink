import jwt from 'jsonwebtoken';
import { db, calculateDistanceKm } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hemolink-production-secret-key-2026';

export function setupSocketIO(io) {
  // Middleware for Socket Authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication token required for Socket connection'));
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      };
      next();
    } catch (err) {
      return next(new Error('Invalid Socket authentication token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Authenticated socket connected: ${socket.id} (User #${socket.user.id}, Role: ${socket.user.role})`);
    
    // Auto-join private user room for notifications
    socket.join(`user:${socket.user.id}`);

    // Join Request Tracking Room (verifying authorization)
    socket.on('request:join', async ({ requestId }) => {
      try {
        const reqRes = await db.query(
          `SELECT id, requester_id, status FROM blood_requests WHERE id = $1`,
          [requestId]
        );
        
        if (reqRes.rows.length === 0) {
          return socket.emit('error', { message: 'Request not found' });
        }
        
        const request = reqRes.rows[0];
        
        // Verify user is either the requester, an accepted donor, or an admin
        const matchRes = await db.query(
          `SELECT id FROM matches WHERE request_id = $1 AND donor_id = $2 AND status = 'ACCEPTED'`,
          [requestId, socket.user.id]
        );
        
        const isRequester = request.requester_id === socket.user.id;
        const isAcceptedDonor = matchRes.rows.length > 0;
        const isAdmin = socket.user.role === 'admin';
        
        if (!isRequester && !isAcceptedDonor && !isAdmin) {
          return socket.emit('error', { message: 'Unauthorized access to this tracking room' });
        }
        
        socket.join(`request:${requestId}`);
        console.log(`📡 User #${socket.user.id} joined tracking room: request:${requestId}`);
        
        // Send current session state if available
        const sessionRes = await db.query(
          `SELECT * FROM location_sessions WHERE request_id = $1 AND active = TRUE`,
          [requestId]
        );
        
        if (sessionRes.rows.length > 0) {
          socket.emit('tracking:initialState', sessionRes.rows[0]);
        }
      } catch (err) {
        console.error('Socket join error:', err);
        socket.emit('error', { message: 'Failed to join tracking room' });
      }
    });

    // Handle real-time GPS Location updates from Donor device
    socket.on('tracking:location', async ({ requestId, latitude, longitude }) => {
      try {
        if (!requestId || latitude == null || longitude == null) return;

        // Verify request & session ownership
        const sessionRes = await db.query(
          `SELECT ls.*, br.latitude as req_lat, br.longitude as req_lng, br.status as req_status
           FROM location_sessions ls
           JOIN blood_requests br ON ls.request_id = br.id
           WHERE ls.request_id = $1 AND ls.donor_id = $2 AND ls.active = TRUE`,
          [requestId, socket.user.id]
        );

        if (sessionRes.rows.length === 0) {
          return socket.emit('error', { message: 'No active location session found for this request' });
        }

        const session = sessionRes.rows[0];
        const distanceKm = calculateDistanceKm(
          parseFloat(latitude),
          parseFloat(longitude),
          parseFloat(session.req_lat),
          parseFloat(session.req_lng)
        );

        // Estimate ETA assuming average speed of 30 km/h in city traffic
        const avgSpeedKmH = 30;
        const etaMinutes = Math.max(1, Math.round((distanceKm / avgSpeedKmH) * 60));

        // Update session in DB
        await db.query(
          `UPDATE location_sessions 
           SET donor_lat = $1, donor_lng = $2, distance_km = $3, eta_minutes = $4, updated_at = CURRENT_TIMESTAMP
           WHERE request_id = $5`,
          [latitude, longitude, distanceKm, etaMinutes, requestId]
        );

        // Also update donor profile current location
        await db.query(
          `UPDATE donor_profiles SET latitude = $1, longitude = $2 WHERE user_id = $3`,
          [latitude, longitude, socket.user.id]
        );

        // Broadcast real-time location to all clients in request tracking room
        io.to(`request:${requestId}`).emit('tracking:locationUpdated', {
          requestId,
          donorId: socket.user.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          distanceKm,
          etaMinutes,
          updatedAt: new Date().toISOString()
        });

      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}
