
import fetch from 'node-fetch';

async function test() {
  const baseUrl = 'http://localhost:3000/api/pl';
  const filters = [
    '',
    '?assignee=Admin',
    '?shop=Main%20Shop',
    '?channel=Online',
    '?assignee=Admin&shop=Main%20Shop'
  ];

  for (const f of filters) {
    console.log(`Testing: ${baseUrl}${f}`);
    try {
      const res = await fetch(`${baseUrl}${f}`);
      const data = await res.json();
      console.log(`- Status: ${res.status}`);
      console.log(`- Revenue: ${data.summary?.total_revenue || 0}`);
      console.log(`- Orders: ${data.summary?.total_orders || 0}`);
      console.log('---');
    } catch (e) {
      console.log(`- Error: ${e.message}`);
    }
  }
}

test();
