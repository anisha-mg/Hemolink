import 'dotenv/config';
import { firestore } from './src/config/firebase.js';

const collections = [
  'users',
  'donor_profiles',
  'requester_profiles',
  'blood_requests',
  'matches',
  'donations',
  'notifications',
  'registration_otps'
];

async function inspectData() {
  console.log('\n========================================');
  console.log('🔥 HEMOLINK FIRESTORE DATA INSPECTOR');
  console.log('========================================\n');

  for (const col of collections) {
    try {
      const snap = await firestore.collection(col).get();
      console.log(`📁 Collection: [${col}] - Total Documents: ${snap.size}`);

      if (!snap.empty) {
        snap.forEach(doc => {
          console.log(`   📄 ID: ${doc.id} =>`, JSON.stringify(doc.data(), null, 2));
        });
      } else {
        console.log('   (No documents found in this collection)');
      }
      console.log('----------------------------------------');
    } catch (err) {
      console.log(`   ❌ Failed to query ${col}:`, err.message);
    }
  }
}

inspectData().then(() => process.exit(0));
