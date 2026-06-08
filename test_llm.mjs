import Database from 'better-sqlite3';
const key = process.env.ZAI_API_KEY;
console.log('Key prefix:', key?.substring(0, 10));

const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'glm-5.1', messages: [{ role: 'user', content: 'Say hello' }], temperature: 0.2 })
});
console.log('Status:', resp.status);
const data = await resp.json();
console.log('Response:', JSON.stringify(data).substring(0, 300));
