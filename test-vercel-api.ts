import 'dotenv/config';

async function checkVercel() {
  try {
    const res = await fetch('https://arthairesume.vercel.app/api/resumes?status=pending', {
      headers: {
        'x-admin-password': 'admin123'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Raw response:", text);
  } catch (e) {
    console.error(e);
  }
}

checkVercel();
