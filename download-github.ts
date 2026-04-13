import fs from 'fs';
import https from 'https';

https.get('https://raw.githubusercontent.com/patelarthAI/Resume-Formatting/main/server.ts', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('github-server.ts', data);
    console.log("Downloaded github-server.ts");
  });
});
