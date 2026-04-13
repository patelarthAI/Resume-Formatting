import 'dotenv/config';

async function testLarge() {
  try {
    const largeString = 'A'.repeat(60 * 1024 * 1024); // 60MB
    const res = await fetch('http://localhost:3000/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: largeString, userId: 'test' })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

testLarge();
