import http from 'node:http';
import { config } from './config.js';
import { GameSocketServer } from './websocket/socketServer.js';
import { createHttpHandler, getLocalLanIp } from './app.js';

const server = http.createServer(createHttpHandler());

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
