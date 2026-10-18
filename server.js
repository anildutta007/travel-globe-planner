/**
 * AeroGlobe AI - Interactive 3D Travel Globe, Cost Estimator & Itinerary Planner
 * Node.js HTTP Server (Port 8098)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 8098;
const HOST = '127.0.0.1';
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/health') {
    const payload = JSON.stringify({ status: 'ok', service: 'AeroGlobe AI Travel Planner', port: PORT });
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(payload);
  }

  const targetRel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(BASE_DIR, targetRel);

  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    res.end(content);
  });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log('======================================================================');
  console.log('  AeroGlobe AI - Interactive 3D Travel Globe & Itinerary Planner');
  console.log(`  Server running at: ${url}`);
  console.log('======================================================================');
  if (!process.argv.includes('--no-browser')) {
    exec(`start "" "${url}"`);
  }
});
