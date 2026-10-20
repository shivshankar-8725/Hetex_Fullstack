const https = require('https');

https.get('https://www.xpressbees.com/static/js/main.5209df80.js', { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // Search for any string ending in .png, .svg, .webp
    const matches = data.match(/["']([^"']+\.(png|svg|webp|jpg))["']/g) || [];
    console.log('Matches:', Array.from(new Set(matches)).slice(0, 50));
  });
});
