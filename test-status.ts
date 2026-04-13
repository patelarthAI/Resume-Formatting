import 'dotenv/config';

async function testStatus() {
  const baseUrl = 'http://localhost:3000';
  
  console.log("Testing /api/resumes/:id/status");
  try {
    const res = await fetch(`${baseUrl}/api/resumes/123/status`);
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }
}

testStatus();
