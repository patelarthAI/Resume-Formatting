import 'dotenv/config';

async function testSubmit() {
  const baseUrl = 'http://localhost:3000';
  
  console.log("Testing /api/submit");
  try {
    const res = await fetch(`${baseUrl}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { text: "test" }, userId: null })
    });
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }
}

testSubmit();
