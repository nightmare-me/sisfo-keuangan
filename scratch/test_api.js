const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/karyawan?userId=clut7xyxw0000m9b4g4x6z6z6', {
      headers: {
         'Cookie': 'next-auth.session-token=...' // I don't have a valid token here
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (e) {
    console.error("Fetch error:", e.message);
  }
}

test();
