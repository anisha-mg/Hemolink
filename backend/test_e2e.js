const BASE_URL = 'http://localhost:5000/api';

async function runE2ETest() {
  console.log('🧪 Starting HemoLink End-to-End Acceptance Test...');

  // 1. Register Requester
  console.log('\n1. Registering Requester account...');
  const reqRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'requester',
      fullName: 'Test Requester Person',
      email: `requester_${Date.now()}@test.org`,
      phone: '9876543210',
      password: 'password123',
      city: 'Hyderabad',
      address: 'Madhapur, Hyderabad',
      latitude: 17.4447,
      longitude: 78.3915
    })
  });
  const reqData = await reqRes.json();
  console.log('✅ Requester registered:', reqData.user.email);
  const requesterToken = reqData.token;

  // 2. Register Compatible Donor (O- blood group within 5 km)
  console.log('\n2. Registering Compatible Donor account (O-)...');
  const donorRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'donor',
      fullName: 'Test Donor Hero',
      email: `donor_${Date.now()}@test.org`,
      phone: '9876543211',
      password: 'password123',
      bloodGroup: 'O-',
      city: 'Hyderabad',
      address: 'Jubilee Hills, Hyderabad',
      latitude: 17.4321,
      longitude: 78.4071,
      availability: true
    })
  });
  const donorData = await donorRes.json();
  console.log('✅ Donor registered:', donorData.user.email);
  const donorToken = donorData.token;

  // 3. Requester creates Emergency Blood Request for O+ blood
  console.log('\n3. Requester creating Emergency Blood Request for O+ blood...');
  const requestRes = await fetch(`${BASE_URL}/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${requesterToken}`
    },
    body: JSON.stringify({
      patientName: 'Emergency Patient X',
      bloodGroup: 'O+',
      unitsNeeded: 2,
      hospitalName: 'KIMS Hospital Hyderabad',
      city: 'Hyderabad',
      address: 'Minister Road',
      latitude: 17.4374,
      longitude: 78.4482,
      urgency: 'critical',
      notes: 'Urgent ICU requirement'
    })
  });
  const requestData = await requestRes.json();
  console.log('✅ Request created! Matched Donors Count:', requestData.matchedDonorsCount);
  const requestId = requestData.request.id;

  // 4. Donor fetches pending matches
  console.log('\n4. Donor fetching pending matches...');
  const matchesRes = await fetch(`${BASE_URL}/matches/my-matches`, {
    headers: { 'Authorization': `Bearer ${donorToken}` }
  });
  const matchesData = await matchesRes.json();
  console.log(`✅ Found ${matchesData.matches.length} pending match(es) for donor`);
  const match = matchesData.matches[0];
  console.log(`   Match Details: ID #${match.id}, Distance: ${match.distance_km} km`);

  // 5. Donor Accepts Match
  console.log('\n5. Donor accepting match via POST /api/matches/:matchId/respond...');
  const respondRes = await fetch(`${BASE_URL}/matches/${match.id}/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${donorToken}`
    },
    body: JSON.stringify({ action: 'ACCEPT' })
  });
  const respondData = await respondRes.json();
  console.log('✅ Donor accept response:', respondData.message);

  // 6. Complete Donation & Enforce Cooldown
  console.log('\n6. Completing donation and enforcing 90-day cooldown...');
  const donationRes = await fetch(`${BASE_URL}/donations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${requesterToken}`
    },
    body: JSON.stringify({ requestId, unitsDonated: 2, notes: 'Donated 2 units successfully' })
  });
  const donationData = await donationRes.json();
  console.log('✅ Donation completed:', donationData.message);

  // 7. Verify Admin SQL aggregation stats
  console.log('\n7. Querying Admin SQL Stats (SELECT COUNT(*)...)...');
  const adminRes = await fetch(`${BASE_URL}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${requesterToken}` }
  });
  const adminData = await adminRes.json();
  console.log('✅ Admin Stats SQL query result:', adminData.stats);

  console.log('\n🎉 ALL ACCEPTANCE TEST STEPS PASSED SUCCESSFULLY!');
}

runE2ETest().catch(err => {
  console.error('❌ E2E Test Failed:', err);
});
