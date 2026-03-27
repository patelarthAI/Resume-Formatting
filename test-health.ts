import axios from 'axios';

async function test() {
  try {
    const response = await axios.get('http://localhost:3000/api/health');
    console.log("Health Check Response:", response.data);
  } catch (e: any) {
    console.error("Health Check Failed:", e.message);
    if (e.response) {
      console.error("Response data:", e.response.data);
    }
  }
}

test();
