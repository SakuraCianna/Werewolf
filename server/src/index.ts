import http from 'node:http';
import { config } from './config.js';
import { GameSocketServer } from './websocket/socketServer.js';

const server = http.createServer((req, res) => {
  // CORS 响应头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'voice-werewolf-server',
        version: '1.0.0',
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

server.listen(config.port, () => {
  console.log(`🐺 Voice Werewolf Server running on http://localhost:${config.port}`);
  console.log(`🎙️ AssemblyAI Streaming: ${config.mockVoice ? 'Mock Mode' : 'Live Mode'}`);
  console.log(`🧠 DeepSeek Flash: ${config.mockLLM ? 'Mock Mode' : 'Live Mode'}`);
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
