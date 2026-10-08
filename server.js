// Node.js frontend server: serves the web page and proxies /api to the Spring Boot backend.
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:8080';

const app = express();
app.use('/api', createProxyMiddleware({ target: API_URL, changeOrigin: true, pathRewrite: (p) => '/api' + p }));
app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Frontend on http://localhost:${PORT} -> API ${API_URL}`));
