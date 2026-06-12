const fs = require('fs');

async function main() {
  const code = fs.readFileSync('seed_proxi_table_v3.cjs', 'utf-8');
  const urls = [...code.matchAll(/https?:\/\/[^\s\'\"\\]+/g)].map(m => m[0]);
  console.log('Found', urls.length, 'URLs to check.');

  const checkUrl = async (url) => {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: {'User-Agent': 'Mozilla/5.0'} });
      if (res.status >= 400 && res.status !== 405 && res.status !== 403) {
        console.log('BROKEN: ' + res.status + ' ' + url);
      }
    } catch (e) {
      console.log('ERROR: ' + url + ' ' + e.message);
    }
  };

  await Promise.all(urls.map(checkUrl));
  console.log('Done checking.');
}

main();
