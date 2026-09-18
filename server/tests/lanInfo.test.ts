import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpHandler } from '../src/app.js';

describe('HTTP Server API & LAN Info Endpoint 测试', () => {
  let server: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    // 直接复用生产的真实 HTTP Request Handler
    server = http.createServer(createHttpHandler());
    await new Promise<void>((resolve) => server.listen(0, resolve));
    serverPort = (server.address() as { port: number }).port;
  });

  afterAll(() => {
    server.close();
  });

  it('GET /api/lan-info 必须正确返回 JSON 数据并包含局域网 IP 与端口', async () => {
    const res = await fetch(`http://localhost:${serverPort}/api/lan-info`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.lanIp).toBeDefined();
    expect(typeof data.lanIp).toBe('string');
    expect(data.port).toBe(3001);
    expect(data.clientPort).toBe(5173);
  });

  it('GET /health 必须返回 ok 状态及服务信息', async () => {
    const res = await fetch(`http://localhost:${serverPort}/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.service).toBe('voice-werewolf-server');
  });

  it('OPTIONS 预检请求必须返回 204 并携带合法的 CORS 请求头', async () => {
    const res = await fetch(`http://localhost:${serverPort}/api/lan-info`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-methods')).toContain('GET');
  });

  it('访问不存在的端点必须返回 404', async () => {
    const res = await fetch(`http://localhost:${serverPort}/api/non-existent-route`);
    expect(res.status).toBe(404);
  });
});
