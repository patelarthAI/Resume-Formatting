import https from 'https';

https.get('https://api.github.com/repos/patelarthAI/Resume-Formatting/commits?path=server.ts', {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const commits = JSON.parse(data);
    console.log(commits.map(c => ({ sha: c.sha, message: c.commit.message })).slice(0, 5));
  });
});
