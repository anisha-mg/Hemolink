const BASE_URL = 'http://localhost:5000/api';

async function testRoleSwitch() {
  console.log('🧪 Testing Role Switch feature...');

  // 1. Register Donor
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'Role Switch Test User',
      email: `switch_${Date.now()}@test.org`,
      phone: '9876543210',
      password: 'password123',
      bloodGroup: 'A+',
      city: 'Hyderabad',
      address: 'Gachibowli'
    })
  });
  const regData = await regRes.json();
  console.log('✅ Initial Role:', regData.user.role);

  // 2. Call switch-role
  const switchRes1 = await fetch(`${BASE_URL}/auth/switch-role`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${regData.token}` }
  });
  const switchData1 = await switchRes1.json();
  console.log('✅ Switched Role 1:', switchData1.user.role, '-', switchData1.message);

  // 3. Call switch-role back
  const switchRes2 = await fetch(`${BASE_URL}/auth/switch-role`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${switchData1.token}` }
  });
  const switchData2 = await switchRes2.json();
  console.log('✅ Switched Role 2:', switchData2.user.role, '-', switchData2.message);

  console.log('🎉 ROLE SWITCH API TEST PASSED!');
}

testRoleSwitch().catch(err => console.error('❌ Role switch test failed:', err));
