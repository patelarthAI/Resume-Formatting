import 'dotenv/config';

async function testInvalid() {
  try {
    const res = await fetch('http://localhost:3000/api/invalid-route');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 100));
  } catch (e) {
    console.error(e);
  }
}

testInvalid();
