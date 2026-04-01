import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const app = express();

app.disable('x-powered-by');

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
  }),
);

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 8080);

app.listen(port, '0.0.0.0', () => {
  console.log(`7Flow listening on port ${port}`);
});
