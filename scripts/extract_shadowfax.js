const fs = require('fs');
const svg = fs.readFileSync('test_shadowfax.svg', 'utf8');
const match = svg.match(/base64,([^"']+)/);
if (match) {
  fs.writeFileSync('test_shadowfax.png', Buffer.from(match[1], 'base64'));
  console.log('Saved test_shadowfax.png, size:', fs.statSync('test_shadowfax.png').size);
}
