import 'dotenv/config';

async function testApis() {
  const baseUrl = 'http://localhost:3000';
  
  console.log("Testing /api/health");
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }

  console.log("\nTesting /api/admin/verify");
  try {
    const res = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' })
    });
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }

  console.log("\nTesting /api/resumes");
  try {
    const res = await fetch(`${baseUrl}/api/resumes?status=pending`, {
      headers: { 'x-admin-password': process.env.APP_ADMIN_PASSWORD || 'admin123' }
    });
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }
}

testApis();
