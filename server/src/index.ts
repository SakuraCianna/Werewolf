import http from 'node:http';
import os from 'node:os';
import { config } from './config.js';
import { GameSocketServer } from './websocket/socketServer.js';

function getLocalLanIp(): string {
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

const server = http.createServer((req, res) => {
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
  res.end();
});

// 初始化 WebSocket 游戏服务器
new GameSocketServer(server);

server.listen(config.port, '0.0.0.0', () => {
  const lanIp = getLocalLanIp();
  console.log(`🐺 Voice Werewolf Server running on http://localhost:${config.port} (LAN: http://${lanIp}:${config.port})`);
  console.log(`🎙️ AssemblyAI Streaming: ${config.mockVoice ? 'Mock Mode' : 'Live Mode'}`);
  console.log(`🧠 DeepSeek Flash: ${config.mockLLM ? 'Mock Mode' : 'Live Mode'}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
