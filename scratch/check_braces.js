const fs = require('fs');
const content = fs.readFileSync('c:/Users/User/Documents/sisfo-keuangan/app/(dashboard)/users/page.tsx', 'utf8');

let balance = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') balance++;
  if (content[i] === '}') balance--;
}
console.log("Brace balance:", balance);
