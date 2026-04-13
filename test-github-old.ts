import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/patelarthAI/Resume-Formatting/ff283f33449d039596a56074c0c0aca3262d4e56/server.ts', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('github-server-old.ts', data);
    console.log("Downloaded github-server-old.ts");
  });
});
