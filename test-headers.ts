import 'dotenv/config';

async function testHeaders() {
  try {
    const res = await fetch('http://localhost:3000/api/resumes?status=pending', {
      headers: {
        'x-admin-password': process.env.APP_ADMIN_PASSWORD || 'admin123'
      }
    });
    console.log("Status:", res.status);
    console.log("Headers:");
    res.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    const text = await res.text();
    console.log("Response:", text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

testHeaders();
