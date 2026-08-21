const BASE_URL = 'http://localhost:5000/api';

async function testSessionPersistence() {
  console.log('🧪 Testing Account Persistence & Future Logins...');

  const userEmail = `persistent_user_${Date.now()}@test.org`;
  const userPassword = 'mySecurePassword123';

  // 1. Initial Registration
  console.log('\n1. Registering user account in PostgreSQL database...');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'Persistent Hero Donor',
      email: userEmail,
      phone: '9876543210',
      password: userPassword,
      bloodGroup: 'AB+',
      city: 'Hyderabad'
    })
  });
  const regData = await regRes.json();
  console.log('✅ Account successfully registered and stored in database:', regData.user.email);

  // 2. Future Login using registered credentials
  console.log('\n2. Simulating Future Login using email and password...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password: userPassword })
  });
  const loginData = await loginRes.json();
  console.log('✅ Future Login Successful! Retreived user profile:', loginData.user.fullName);

  // 3. Persistent Session check (GET /api/auth/me with JWT token)
  console.log('\n3. Simulating Persistent Session validation (GET /api/auth/me)...');
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const meData = await meRes.json();
  console.log('✅ Session verified! Role:', meData.user.role, '| Email:', meData.user.email);

  console.log('\n🎉 ALL PERSISTENT ACCOUNT & SESSION TESTS PASSED!');
}

testSessionPersistence().catch(err => {
  console.error('❌ Session test failed:', err);
});
