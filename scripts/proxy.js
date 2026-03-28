const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PUBLIC_PORT = parseInt(process.env.PORT || '10000', 10);
const PAPERCLIP_PORT = PUBLIC_PORT + 1; // internal port for paperclipai
const DASHBOARD_DIR = '/app/dashboard/dist';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function serveDashboardFile(req, res) {
  // Strip /office prefix
  let urlPath = req.url.replace(/^\/office/, '') || '/';
  if (urlPath === '/') urlPath = '/index.html';

  // Remove query string
  urlPath = urlPath.split('?')[0];

  const filePath = path.join(DASHBOARD_DIR, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(DASHBOARD_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback — serve index.html for any unmatched route
      fs.readFile(path.join(DASHBOARD_DIR, 'index.html'), (err2, html) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function proxyToPaperclip(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: PAPERCLIP_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${PAPERCLIP_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    // Paperclip not ready yet — return 502
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Paperclip server not ready', detail: err.message }));
    }
  });

  req.pipe(proxyReq, { end: true });
}

// Handle WebSocket upgrades (proxy to Paperclip for real-time events)
function handleUpgrade(req, socket, head) {
  const options = {
    hostname: '127.0.0.1',
    port: PAPERCLIP_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', () => {
    socket.end();
  });

  proxyReq.end();
}

// Check if dashboard is available
const hasDashboard = fs.existsSync(path.join(DASHBOARD_DIR, 'index.html'));

const server = http.createServer((req, res) => {
  // Route /office/* to dashboard static files
  if (hasDashboard && (req.url === '/office' || req.url.startsWith('/office/'))) {
    serveDashboardFile(req, res);
    return;
  }

  // Everything else goes to Paperclip
  proxyToPaperclip(req, res);
});

server.on('upgrade', handleUpgrade);

server.listen(PUBLIC_PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on port ${PUBLIC_PORT}`);
  console.log(`[proxy] Dashboard: http://0.0.0.0:${PUBLIC_PORT}/office`);
  console.log(`[proxy] Paperclip: proxying to 127.0.0.1:${PAPERCLIP_PORT}`);
});
