// Server-side blood compatibility logic
// Rule matrix:
// Donor O- can donate to: ALL (O-, O+, A-, A+, B-, B+, AB-, AB+)
// Donor O+ can donate to: O+, A+, B+, AB+
// Donor A- can donate to: A-, A+, AB-, AB+
// Donor A+ can donate to: A+, AB+
// Donor B- can donate to: B-, B+, AB-, AB+
// Donor B+ can donate to: B+, AB+
// Donor AB- can donate to: AB-, AB+
// Donor AB+ can donate to: AB+ only

const COMPATIBILITY_MATRIX = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+']
};

export function isCompatibleDonor(donorGroup, recipientGroup) {
  if (!donorGroup || !recipientGroup) return false;
  const normalizedDonor = donorGroup.trim().toUpperCase();
  const normalizedRecipient = recipientGroup.trim().toUpperCase();
  
  const compatibleRecipients = COMPATIBILITY_MATRIX[normalizedDonor];
  if (!compatibleRecipients) return false;
  
  return compatibleRecipients.includes(normalizedRecipient);
}

// Calculate cooldown availability based on last donation date (90 days cooldown)
export function isDonorInCooldown(lastDonationDate) {
  if (!lastDonationDate) return false;
  const lastDate = new Date(lastDonationDate);
  if (isNaN(lastDate.getTime())) return false;
  
  const now = new Date();
  const diffTime = Math.abs(now - lastDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays < 90;
}
