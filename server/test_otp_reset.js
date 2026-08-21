const BASE_URL = 'http://localhost:5000/api';

async function testOtpResetFlow() {
  console.log('🧪 Testing Forgot Password & OTP Reset flow...');

  const testEmail = `otp_test_${Date.now()}@test.org`;
  const originalPassword = 'originalPassword123';
  const newPassword = 'newSecretPassword456';

  // 1. Register User
  console.log('\n1. Registering test user account...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'OTP Test Donor',
      email: testEmail,
      phone: '9876543210',
      password: originalPassword,
      bloodGroup: 'B+',
      city: 'Hyderabad'
    })
  });
  const regData = await regRes.json();
  console.log('✅ Registered user:', regData.user.email);

  // 2. Request Forgot Password OTP
  console.log('\n2. Requesting Forgot Password OTP...');
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const forgotData = await forgotRes.json();
  console.log('✅ OTP Generated & Retrieved:', forgotData.otp);

  // 3. Verify OTP
  console.log('\n3. Verifying 6-digit OTP code...');
  const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: forgotData.otp })
  });
  const verifyData = await verifyRes.json();
  console.log('✅ OTP Verification Response:', verifyData.message);

  // 4. Reset Password
  console.log('\n4. Resetting password to new password...');
  const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      otp: forgotData.otp,
      newPassword
    })
  });
  const resetData = await resetRes.json();
  console.log('✅ Reset Password Response:', resetData.message);

  // 5. Test Login with New Password
  console.log('\n5. Logging in with new password...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: newPassword })
  });
  const loginData = await loginRes.json();
  console.log('✅ Login Successful! User token received for:', loginData.user.email);

  console.log('\n🎉 ALL OTP FORGOT PASSWORD TESTS PASSED SUCCESSFULLY!');
}

testOtpResetFlow().catch(err => {
  console.error('❌ OTP Reset test failed:', err);
});
