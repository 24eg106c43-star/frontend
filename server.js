// Node.js frontend server: serves the web page and proxies /api to the Spring Boot backend.
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:8080';

const app = express();
app.use('/api', createProxyMiddleware({ target: API_URL, changeOrigin: true, pathRewrite: (p) => '/api' + p }));

const staticDir = fs.existsSync(path.join(__dirname, 'dist')) ? path.join(__dirname, 'dist') : path.join(__dirname, 'public');
app.use(express.static(staticDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => console.log(`Frontend running on port ${PORT} -> API proxying to ${API_URL}`));
