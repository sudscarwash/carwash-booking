import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable gzip/deflate response compression to reduce payload transfer by 70%-80%
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Balanced compression speed vs CPU
}));

// Enable strong ETag generation for 304 Not Modified caching
app.set('etag', 'strong');

// Google Cloud Run defaults to port 8080, local dev/Render defaults to 3000
const PORT = process.env.PORT || 3000;

// Health check endpoint for Cloud Run and Render load balancers
app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve compiled static assets from dist/
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath, {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Cache static immutable assets (JS, CSS, images)
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA Catch-all: Send index.html for all client-side routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[FOODFINDR Production Server] Running on port ${PORT}`);
});
