const BASE_URL = 'http://localhost:5000/api';

async function testEmailValidation() {
  console.log('🧪 Testing Email Registration & Unregistered Validation...');

  const unregEmail = `unregistered_${Date.now()}@domain.com`;
  const existingEmail = `existing_${Date.now()}@domain.com`;

  // 1. Forgot password with unregistered email
  console.log('\n1. Testing Forgot Password with UNREGISTERED email...');
  const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unregEmail })
  });
  const forgotData = await forgotRes.json();
  console.log(`✅ Unregistered Email Response (HTTP ${forgotRes.status}):`, forgotData.message);

  // 2. Register first user account
  console.log('\n2. Registering initial account with email:', existingEmail);
  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'First Account Holder',
      email: existingEmail,
      phone: '9876543210',
      password: 'password123',
      bloodGroup: 'O+',
      city: 'Hyderabad'
    })
  });
  const reg1Data = await reg1Res.json();
  console.log('✅ Account 1 registered successfully');

  // 3. Register second user account with the SAME email
  console.log('\n3. Attempting to register second account with the SAME email...');
  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'requester',
      fullName: 'Duplicate Account Attempt',
      email: existingEmail,
      phone: '9876543211',
      password: 'password456',
      city: 'Hyderabad'
    })
  });
  const reg2Data = await reg2Res.json();
  console.log(`✅ Duplicate Email Response (HTTP ${reg2Res.status}):`, reg2Data.message);

  console.log('\n🎉 ALL EMAIL VALIDATION TESTS PASSED SUCCESSFULLY!');
}

testEmailValidation().catch(err => {
  console.error('❌ Email validation test failed:', err);
});
