import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER || 'aniishaa1809@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'imvklcgpkflxvprr';

// Create Nodemailer Transporter using Gmail App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

// Send 6-digit OTP Email for Account Creation Verification
export async function sendRegisterOTPEmail(toEmail, otp) {
  try {
    const mailOptions = {
      from: `"HemoLink Account Verification" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `🔑 HemoLink Account Registration OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #DC143C; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">HemoLink</h1>
            <p style="color: #ffe4e6; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Real-Time Emergency Blood Network</p>
          </div>
          <div style="padding: 32px 24px; text-align: center; color: #1e293b;">
            <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; color: #0f172a;">Verify Your Email Address</h2>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
              Thank you for signing up for HemoLink! Enter the 6-digit OTP code below to verify your email address and activate your account.
            </p>
            <div style="background-color: #f8fafc; border: 2px dashed #DC143C; border-radius: 12px; padding: 16px; display: inline-block; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #DC143C;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">
              This verification code is valid for <strong>10 minutes</strong>.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Sent by HemoLink Emergency Blood Network • Sender: ${EMAIL_USER}
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Registration OTP Email dispatched to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send registration OTP email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Send 6-digit OTP Email for Password Reset
export async function sendOTPEmail(toEmail, otp) {
  try {
    const mailOptions = {
      from: `"HemoLink Real-Time Emergency" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `🔑 HemoLink Password Reset OTP: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background-color: #DC143C; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">HemoLink</h1>
            <p style="color: #ffe4e6; margin: 4px 0 0 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Real-Time Emergency Blood Network</p>
          </div>
          <div style="padding: 32px 24px; text-align: center; color: #1e293b;">
            <h2 style="font-size: 20px; font-weight: bold; margin-top: 0; color: #0f172a;">Password Reset OTP</h2>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px;">
              You requested a password reset for your HemoLink account. Use the 6-digit OTP code below to verify your identity.
            </p>
            <div style="background-color: #f8fafc; border: 2px dashed #DC143C; border-radius: 12px; padding: 16px; display: inline-block; margin-bottom: 24px;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #DC143C;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">
              This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.
            </p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Sent by HemoLink Emergency Blood Network • Sender: ${EMAIL_USER}
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 OTP Email dispatched successfully to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, err.message);
    // Don't crash request if email sending fails in dev environment
    return { success: false, error: err.message };
  }
}

// Send Emergency Blood Request Alert Email to Donors
export async function sendEmergencyAlertEmail(toEmail, details) {
  try {
    const mailOptions = {
      from: `"HemoLink Emergency Alert" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `🚨 URGENT: Blood Request for ${details.bloodGroup} at ${details.hospitalName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #DC143C; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">URGENT BLOOD NEEDED</h1>
          </div>
          <div style="padding: 24px; color: #1e293b;">
            <h3 style="margin-top: 0; color: #0f172a;">Patient: ${details.patientName}</h3>
            <p style="font-size: 14px; margin: 6px 0;"><strong>Blood Group:</strong> <span style="color: #DC143C; font-weight: bold;">${details.bloodGroup}</span> (${details.unitsNeeded} Units)</p>
            <p style="font-size: 14px; margin: 6px 0;"><strong>Hospital:</strong> ${details.hospitalName}</p>
            <p style="font-size: 14px; margin: 6px 0;"><strong>Urgency:</strong> ${details.urgency.toUpperCase()}</p>
            <div style="margin-top: 20px; text-align: center;">
              <a href="http://localhost:3000/donor-dashboard" style="background-color: #DC143C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">View Request on Dashboard</a>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send emergency alert email:', err.message);
  }
}
