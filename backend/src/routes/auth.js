import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';
import { sendOTPEmail, sendRegisterOTPEmail } from '../utils/email.js';

const router = express.Router();

// POST /api/auth/send-register-otp - Send OTP to email for account creation
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existingUser = await db.query(`SELECT id FROM users WHERE email = $1`, [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        alreadyExists: true,
        message: `An account with email (${cleanEmail}) already exists. Please sign in or use Forgot Password.`
      });
    }

    // Generate 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in registration_otps
    const existingOtpRow = await db.query(`SELECT id FROM registration_otps WHERE email = $1`, [cleanEmail]);
    if (existingOtpRow.rows.length > 0) {
      await db.query(
        `UPDATE registration_otps SET otp = $1, otp_expiry = CURRENT_TIMESTAMP + INTERVAL '10 minutes', is_verified = FALSE WHERE email = $2`,
        [generatedOtp, cleanEmail]
      );
    } else {
      await db.query(
        `INSERT INTO registration_otps (email, otp, otp_expiry, is_verified) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '10 minutes', FALSE)`,
        [cleanEmail, generatedOtp]
      );
    }

    // Send verification email via Nodemailer
    const emailResult = await sendRegisterOTPEmail(cleanEmail, generatedOtp);
    if (emailResult && emailResult.success === false) {
      console.error('Email dispatch failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: `Failed to send verification OTP email: ${emailResult.error || 'Nodemailer error'}`
      });
    }

    return res.json({
      success: true,
      message: `Verification OTP sent to ${cleanEmail}`
    });

  } catch (err) {
    console.error('Send registration OTP error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to send verification OTP' });
  }
});

// POST /api/auth/register - Register account after OTP verification
router.post('/register', async (req, res) => {
  try {
    const {
      role, // 'donor' or 'requester'
      email,
      phone,
      password,
      fullName,
      bloodGroup,
      dob,
      gender,
      city,
      address,
      latitude,
      longitude,
      lastDonationDate,
      availability,
      otp // 6-digit verification code
    } = req.body;

    if (!email || !phone || !password || !fullName || !role) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!['donor', 'requester'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be either donor or requester' });
    }

    // Check existing email
    const existingUser = await db.query(`SELECT id FROM users WHERE email = $1`, [cleanEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        alreadyExists: true,
        message: `An account with this email address (${cleanEmail}) already exists. Please sign in or use Forgot Password.`
      });
    }

    // Verify OTP if provided
    if (otp) {
      const otpRes = await db.query(
        `SELECT otp, otp_expiry FROM registration_otps WHERE email = $1`,
        [cleanEmail]
      );

      if (otpRes.rows.length === 0 || otpRes.rows[0].otp.trim() !== otp.trim()) {
        return res.status(400).json({ success: false, message: 'Invalid registration OTP code' });
      }

      if (new Date() > new Date(otpRes.rows[0].otp_expiry)) {
        return res.status(400).json({ success: false, message: 'Registration OTP code has expired. Please request a new one.' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user record
    const userRes = await db.query(
      `INSERT INTO users (email, phone, password_hash, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, role, created_at`,
      [email.toLowerCase().trim(), phone.trim(), passwordHash, role]
    );

    const newUser = userRes.rows[0];

    // Sync user record to Firebase Authentication console
    try {
      const { admin } = await import('../config/firebase.js');
      if (admin && admin.auth) {
        await admin.auth().createUser({
          email: email.toLowerCase().trim(),
          password: password,
          displayName: fullName.trim(),
          phoneNumber: phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`
        });
        console.log(`🔥 User (${email}) synced to Firebase Authentication console successfully.`);
      }
    } catch (fbAuthErr) {
      console.warn('ℹ️ Firebase Auth Console sync notice:', fbAuthErr.message);
    }

    const lat = latitude != null ? parseFloat(latitude) : 17.4374;
    const lng = longitude != null ? parseFloat(longitude) : 78.4482;

    if (role === 'donor') {
      if (!bloodGroup) {
        return res.status(400).json({ success: false, message: 'Blood group is required for donors' });
      }

      await db.query(
        `INSERT INTO donor_profiles 
         (user_id, full_name, blood_group, dob, gender, city, address, latitude, longitude, last_donation_date, availability)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          newUser.id,
          fullName.trim(),
          bloodGroup.trim().toUpperCase(),
          dob || null,
          gender || null,
          city || 'Hyderabad',
          address || '',
          lat,
          lng,
          lastDonationDate || null,
          availability !== false
        ]
      );
    } else {
      await db.query(
        `INSERT INTO requester_profiles 
         (user_id, full_name, city, address, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newUser.id,
          fullName.trim(),
          city || 'Hyderabad',
          address || '',
          lat,
          lng
        ]
      );
    }

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Fetch Profile
    let fullName = user.email;
    let bloodGroup = null;
    let availability = null;
    let lastDonationDate = null;
    let latitude = null;
    let longitude = null;

    if (user.role === 'donor') {
      const donorRes = await db.query(`SELECT * FROM donor_profiles WHERE user_id = $1`, [user.id]);
      if (donorRes.rows.length > 0) {
        fullName = donorRes.rows[0].full_name;
        bloodGroup = donorRes.rows[0].blood_group;
        availability = donorRes.rows[0].availability;
        lastDonationDate = donorRes.rows[0].last_donation_date;
        latitude = donorRes.rows[0].latitude;
        longitude = donorRes.rows[0].longitude;
      }
    } else if (user.role === 'requester') {
      const reqRes = await db.query(`SELECT * FROM requester_profiles WHERE user_id = $1`, [user.id]);
      if (reqRes.rows.length > 0) {
        fullName = reqRes.rows[0].full_name;
        latitude = reqRes.rows[0].latitude;
        longitude = reqRes.rows[0].longitude;
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        phone: user.phone,
        fullName,
        bloodGroup,
        availability,
        lastDonationDate,
        latitude,
        longitude
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(`SELECT id, email, phone, role, created_at FROM users WHERE id = $1`, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];
    let profile = {};

    if (user.role === 'donor') {
      const donorRes = await db.query(`SELECT * FROM donor_profiles WHERE user_id = $1`, [user.id]);
      profile = donorRes.rows[0] || {};
    } else if (user.role === 'requester') {
      const reqRes = await db.query(`SELECT * FROM requester_profiles WHERE user_id = $1`, [user.id]);
      profile = reqRes.rows[0] || {};
    }

    return res.json({
      success: true,
      user: {
        ...user,
        profile
      }
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
  }
});

// PUT /api/auth/availability (For donors to toggle availability)
router.put('/availability', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'donor') {
      return res.status(403).json({ success: false, message: 'Only donors can change availability' });
    }

    const { availability } = req.body;
    await db.query(`UPDATE donor_profiles SET availability = $1 WHERE user_id = $2`, [Boolean(availability), req.user.id]);

    return res.json({ success: true, availability: Boolean(availability) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update availability' });
  }
});

// POST /api/auth/switch-role - Toggle role between donor and requester
router.post('/switch-role', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentUser = userRes.rows[0];
    const newRole = currentUser.role === 'donor' ? 'requester' : 'donor';

    // Ensure profile exists for new role
    if (newRole === 'donor') {
      const donorCheck = await db.query(`SELECT id FROM donor_profiles WHERE user_id = $1`, [currentUser.id]);
      if (donorCheck.rows.length === 0) {
        // Fetch requester profile for info
        const reqProf = await db.query(`SELECT * FROM requester_profiles WHERE user_id = $1`, [currentUser.id]);
        const p = reqProf.rows[0] || {};
        await db.query(
          `INSERT INTO donor_profiles (user_id, full_name, blood_group, city, address, latitude, longitude)
           VALUES ($1, $2, 'O+', $3, $4, $5, $6)`,
          [currentUser.id, p.full_name || currentUser.email, p.city || 'Hyderabad', p.address || '', p.latitude || 17.4374, p.longitude || 78.4482]
        );
      }
    } else if (newRole === 'requester') {
      const reqCheck = await db.query(`SELECT id FROM requester_profiles WHERE user_id = $1`, [currentUser.id]);
      if (reqCheck.rows.length === 0) {
        const donorProf = await db.query(`SELECT * FROM donor_profiles WHERE user_id = $1`, [currentUser.id]);
        const p = donorProf.rows[0] || {};
        await db.query(
          `INSERT INTO requester_profiles (user_id, full_name, city, address, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [currentUser.id, p.full_name || currentUser.email, p.city || 'Hyderabad', p.address || '', p.latitude || 17.4374, p.longitude || 78.4482]
        );
      }
    }

    // Update user role in DB
    await db.query(`UPDATE users SET role = $1 WHERE id = $2`, [newRole, currentUser.id]);

    // Generate updated JWT token
    const token = generateToken({ id: currentUser.id, email: currentUser.email, role: newRole });

    // Fetch new profile details
    let profile = {};
    if (newRole === 'donor') {
      const dRes = await db.query(`SELECT * FROM donor_profiles WHERE user_id = $1`, [currentUser.id]);
      profile = dRes.rows[0] || {};
    } else {
      const rRes = await db.query(`SELECT * FROM requester_profiles WHERE user_id = $1`, [currentUser.id]);
      profile = rRes.rows[0] || {};
    }

    return res.json({
      success: true,
      message: `Role switched to ${newRole}`,
      token,
      user: {
        id: currentUser.id,
        email: currentUser.email,
        phone: currentUser.phone,
        role: newRole,
        fullName: profile.full_name || currentUser.email,
        bloodGroup: profile.blood_group || 'O+',
        availability: profile.availability !== false,
        latitude: profile.latitude,
        longitude: profile.longitude,
        profile
      }
    });

  } catch (err) {
    console.error('Switch role error:', err);
    return res.status(500).json({ success: false, message: 'Failed to switch role' });
  }
});

// POST /api/auth/forgot-password - Request OTP for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const userRes = await db.query(`SELECT id, email FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        isNotRegistered: true,
        message: `This email (${email.toLowerCase().trim()}) is not registered with any HemoLink account. Please check your spelling or register a new account.`
      });
    }

    // Generate 6-digit OTP code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database valid for 10 minutes
    await db.query(
      `UPDATE users SET otp = $1, otp_expiry = CURRENT_TIMESTAMP + INTERVAL '10 minutes' WHERE email = $2`,
      [generatedOtp, email.toLowerCase().trim()]
    );

    // Send email using Nodemailer with aniishaa1809@gmail.com
    await sendOTPEmail(email.toLowerCase().trim(), generatedOtp);

    return res.json({
      success: true,
      message: `OTP sent to ${email.toLowerCase().trim()}`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process request' });
  }
});

// POST /api/auth/verify-otp - Verify 6-digit OTP code
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const userRes = await db.query(
      `SELECT id, otp, otp_expiry FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];

    if (!user.otp || user.otp.trim() !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    return res.json({ success: true, message: 'OTP verified successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// POST /api/auth/reset-password - Reset password after OTP verification
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Missing required parameters' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const userRes = await db.query(
      `SELECT id, otp, otp_expiry FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userRes.rows[0];

    if (!user.otp || user.otp.trim() !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP token' });
    }

    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password & clear OTP fields
    await db.query(
      `UPDATE users SET password_hash = $1, otp = NULL, otp_expiry = NULL WHERE email = $2`,
      [passwordHash, email.toLowerCase().trim()]
    );

    return res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

export default router;
