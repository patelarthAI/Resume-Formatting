import 'dotenv/config';

async function checkLocal() {
  try {
    const res = await fetch('http://localhost:3000/api/resumes?status=approved', {
      headers: {
        'x-admin-password': 'admin123'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    const data = JSON.parse(text);
    console.log("Resumes length:", data.resumes?.length);
    console.log("Using Database:", data.usingDatabase);
    console.log("DB Error:", data.dbError);
  } catch (e) {
    console.error(e);
  }
}

checkLocal();
