async function test() {
  const res = await fetch('http://localhost:3001/api/ads/performance', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // I need a cookie/session to bypass auth, but I'll see if I get 401 or 500
    },
    body: JSON.stringify({
      spent: 1000,
      leads: 10,
      platform: 'META',
      date: new Date().toISOString()
    })
  });
  const data = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', data);
}

test();
