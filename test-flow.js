const testFlow = async () => {
  console.log("1. Registering user");
  const regRes = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test_flow@example.com', password: 'password123', business_name: 'Flow Test' })
  });
  
  console.log("Register Auth:", regRes.status);
  const authHeader = regRes.headers.get('set-cookie');
  console.log("Set-Cookie:", authHeader);

  if (regRes.status !== 201 && regRes.status !== 200) {
    console.log(await regRes.json());
    return;
  }

  // extract the cookie:
  const cookie = authHeader.split(';')[0];
  
  console.log("2. Verifying email");
  const verifyRes = await fetch('http://localhost:3000/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  console.log("Verify:", verifyRes.status)
  console.log(await verifyRes.json());

  console.log("3. Fetching /auth/me");
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  console.log("Me:", meRes.status);
  console.log(await meRes.json());
}
testFlow().catch(console.error);
