import axios from 'axios';
import 'dotenv/config';

const adminPassword = (process.env.APP_ADMIN_PASSWORD || 'admin123').trim();

async function test() {
  try {
    console.log(`Testing /api/resumes with password: ${adminPassword}`);
    const response = await axios.get('http://localhost:3000/api/resumes?status=pending', {
      headers: {
        'x-admin-password': adminPassword
      }
    });
    console.log("Response Status:", response.status);
    console.log("Resumes count:", response.data.resumes?.length);
  } catch (e: any) {
    console.error("Test Failed:", e.message);
    if (e.response) {
      console.error("Response status:", e.response.status);
      console.error("Response data:", e.response.data);
    }
  }
}

test();
