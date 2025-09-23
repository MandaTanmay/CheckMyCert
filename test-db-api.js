// Test script to verify the database API is working
const testData = {
  extractedFields: {
    studentName: { value: "manoj" },
    institution: { value: "SRKR" },
    degree: { value: "BTech" },
    graduationDate: { value: "2025-09-24" },
    certificateNumber: { value: "889889889" }
  },
  jobId: "test123"
};

console.log("Testing database verification API...");

fetch('http://localhost:3001/api/database/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', JSON.stringify(data, null, 2));
})
.catch(error => {
  console.error('Error:', error);
});