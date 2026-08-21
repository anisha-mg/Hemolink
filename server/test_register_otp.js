const BASE_URL = 'http://localhost:5000/api';

async function testRegisterOtpFlow() {
  console.log('🧪 Testing Account Creation Email OTP Verification flow...');

  const regEmail = `register_otp_${Date.now()}@test.org`;
  const regPassword = 'accountPassword123';

  // 1. Send Registration OTP
  console.log('\n1. Requesting Registration OTP for email:', regEmail);
  const sendOtpRes = await fetch(`${BASE_URL}/auth/send-register-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail })
  });
  const sendOtpData = await sendOtpRes.json();
  console.log('✅ Registration OTP Generated & Dispatched:', sendOtpData.otp);

  // 2. Complete Account Creation with OTP
  console.log('\n2. Registering account with verified 6-digit OTP...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'OTP Verified Hero Donor',
      email: regEmail,
      phone: '9876543210',
      password: regPassword,
      bloodGroup: 'A+',
      city: 'Hyderabad',
      otp: sendOtpData.otp
    })
  });
  const regData = await regRes.json();
  console.log('✅ Account Creation Successful! User ID:', regData.user.id, '| Role:', regData.user.role);

  // 3. Confirm Login with registered credentials
  console.log('\n3. Logging in with new account credentials...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: regEmail, password: regPassword })
  });
  const loginData = await loginRes.json();
  console.log('✅ Login Successful! Token received for:', loginData.user.email);

  console.log('\n🎉 ALL REGISTRATION OTP EMAIL VERIFICATION TESTS PASSED!');
}

testRegisterOtpFlow().catch(err => {
  console.error('❌ Registration OTP test failed:', err);
});
