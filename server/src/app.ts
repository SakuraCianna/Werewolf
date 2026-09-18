import http from 'node:http';
import os from 'node:os';
import { config } from './config.js';

export function getLocalLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const list = interfaces[name];
    if (list) {
      for (const iface of list) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return 'localhost';
}

export function createHttpHandler(): http.RequestListener {
  return (req, res) => {
    // CORS 响应头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/lan-info') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          lanIp: getLocalLanIp(),
          port: config.port,
          clientPort: 5173,
        }),
      );
      return;
    }

    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'voice-werewolf-server',
          version: '1.0.0',
          lanIp: getLocalLanIp(),
          mockVoice: config.mockVoice,
          mockLLM: config.mockLLM,
        }),
      );
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  };
}
