import http from 'node:http';
import WebSocket from 'ws';
import { describe, it, expect } from 'vitest';
import { AssemblyAIService } from '../src/services/AssemblyAIService.js';
import { TTSService } from '../src/services/TTSService.js';
import { DeepSeekService } from '../src/services/DeepSeekService.js';
import { GameSocketServer } from '../src/websocket/socketServer.js';

describe('External Services 外部服务套件测试', () => {
  it('AssemblyAIService Mock 模式应平稳启动并收集转写', async () => {
    const service = new AssemblyAIService({ forceMock: true });
    let transcriptReceived = '';

    await service.startSession((text) => {
      transcriptReceived = text;
    });

    // 发送模拟 PCM 音频块
    const dummyPcm = Buffer.alloc(320);
    service.sendAudioChunk(dummyPcm);

    const final = await service.endSession();
    expect(typeof final).toBe('string');
  });

  it('TTSService 在网络异常或限流时能安全降级返回 null 而不抛出未捕获异常', async () => {
    // 传入非法音色测试容错边界
    const res = await TTSService.synthesizeToBase64('测试文本', 'non-existent-voice');
    expect(res === null || typeof res === 'string').toBe(true);
  });

  it('DeepSeekService 实例能够正常初始化', () => {
    const deepseek = new DeepSeekService();
    expect(deepseek).toBeDefined();
  });

  it('DeepSeekService 未配置密钥或处于 Mock 模式时应抛出受控异常以便上层降级', async () => {
    const deepseek = new DeepSeekService({ forceMock: true });
    await expect(deepseek.generateCompletion('测试提问')).rejects.toThrow(
      'DeepSeek client not configured or mock mode enabled',
    );
  });

  it('GameSocketServer 能正常启动并向新连接客户端推送 GAME_STATE_SYNC', async () => {
    const server = http.createServer();
    new GameSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const clientWs = new WebSocket(`ws://localhost:${address.port}`);
    const receivedMessages: Array<{ type: string; payload: { state: { phase: string } } }> = [];

    await new Promise<void>((resolve) => {
      clientWs.on('message', (data) => {
        receivedMessages.push(JSON.parse(data.toString()));
        resolve();
      });
    });

    expect(receivedMessages.length).toBeGreaterThan(0);
    expect(receivedMessages[0].type).toBe('GAME_STATE_SYNC');
    expect(receivedMessages[0].payload.state.phase).toBe('IDLE');

    clientWs.close();
    server.close();
  });
});
