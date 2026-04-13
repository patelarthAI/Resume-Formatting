import 'dotenv/config';

async function testExtractDoc() {
  const baseUrl = 'http://localhost:3000';
  
  console.log("Testing /api/extract-doc");
  try {
    const res = await fetch(`${baseUrl}/api/extract-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: Buffer.from("test").toString('base64') })
    });
    console.log("  Status:", res.status);
    console.log("  Response:", await res.text());
  } catch (e) {
    console.error("  Error:", e);
  }
}

testExtractDoc();
