import express from 'express';
const app = express();
app.get('*all', (req, res) => res.send('matched *all'));
app.listen(3001, () => console.log('listening'));
