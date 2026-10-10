const fs = require('fs');

// 1. Update layout.tsx
let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Blaka&display=swap" rel="stylesheet" />',
  '<link href="https://fonts.googleapis.com/css2?family=Changa:wght@200..800&display=swap" rel="stylesheet" />'
);
fs.writeFileSync('src/app/layout.tsx', layout);

// 2. Update globals.css
let css = fs.readFileSync('src/app/globals.css', 'utf8');
css = css.replace(
  '--font-blaka: "Blaka", cursive;',
  '--font-changa: "Changa", sans-serif;'
);
fs.writeFileSync('src/app/globals.css', css);

// 3. Update page.tsx
let page = fs.readFileSync('src/app/page.tsx', 'utf8');
page = page.replace(/font-blaka/g, 'font-changa');
fs.writeFileSync('src/app/page.tsx', page);
console.log('Font updated successfully');
