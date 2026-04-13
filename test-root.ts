import 'dotenv/config';

async function testRoot() {
  try {
    const res = await fetch('http://localhost:3000/');
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 200));
  } catch (e) {
    console.error(e);
  }
}

testRoot();
