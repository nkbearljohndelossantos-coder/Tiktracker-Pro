async function testEndpoints() {
    console.log('Testing HTTP endpoints on port 5002 using native fetch...');
    try {
        // 1. Log in to get JWT token
        console.log('Logging in as admin...');
        const loginRes = await fetch('http://localhost:5002/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        if (!loginRes.ok) {
            const errText = await loginRes.text();
            throw new Error(`Login failed with status ${loginRes.status}: ${errText}`);
        }
        const loginData = await loginRes.json();
        const token = loginData.accessToken;
        console.log('Login successful. Token acquired:', token ? token.slice(0, 15) + '...' : 'undefined');
        // 2. Fetch dashboard stats
        console.log('Fetching dashboard stats...');
        const statsRes = await fetch('http://localhost:5002/api/dashboard/stats', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsRes.ok) {
            const errText = await statsRes.text();
            throw new Error(`Dashboard stats failed with status ${statsRes.status}: ${errText}`);
        }
        const statsData = await statsRes.json();
        console.log('Dashboard Stats Response:', statsData);
        console.log('✔ Dashboard API test passed.');
    }
    catch (err) {
        console.error('API TEST FAILED:', err.message);
    }
}
testEndpoints();
export {};
