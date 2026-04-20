const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\User\\Documents\\sisfo-keuangan\\app\\(dashboard)\\dashboard\\page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 188; i < 202; i++) {
    console.log(`${i+1}: ${lines[i]} (HEX: ${Buffer.from(lines[i]).toString('hex')})`);
}
