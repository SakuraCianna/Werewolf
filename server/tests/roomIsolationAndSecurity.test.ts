import http from 'node:http';
import WebSocket from 'ws';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameSocketServer } from '../src/websocket/socketServer.js';
import { RoomManager } from '../src/game/RoomManager.js';
import type { WSMessage } from 'voice-werewolf-shared';

describe('Room Isolation and Security 多房间隔离与安全攻击防御测试', () => {
  let server: http.Server;
  let serverPort: number;

  beforeAll(async () => {
    server = http.createServer();
    new GameSocketServer(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    serverPort = (server.address() as { port: number }).port;
  });

  afterAll(() => {
    server.close();
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${serverPort}`);
      ws.on('open', () => resolve(ws));
    });
  }

  function waitForMessage(ws: WebSocket, predicate: (msg: WSMessage) => boolean, timeoutMs = 2500): Promise<WSMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message matching predicate after ${timeoutMs}ms`));
      }, timeoutMs);

      const onMessage = (data: WebSocket.RawData) => {
        try {
          const msg: WSMessage = JSON.parse(data.toString());
          if (predicate(msg)) {
            clearTimeout(timer);
            ws.off('message', onMessage);
            resolve(msg);
          }
        } catch {
          // ignore
        }
      };

      ws.on('message', onMessage);
    });
  }

  it('多房间广播严格隔离：Room A 内的事件绝不泄露给 Room B 的客户端', async () => {
    const wsA1 = await connectClient();
    const wsB1 = await connectClient();

    const roomA = `room-iso-A-${Date.now()}`;
    const roomB = `room-iso-B-${Date.now()}`;

    // A1 加入 Room A
    wsA1.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId: roomA } }));
    await waitForMessage(wsA1, (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { roomId: string }).roomId === roomA);

    // B1 加入 Room B
    wsB1.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId: roomB } }));
    await waitForMessage(wsB1, (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { roomId: string }).roomId === roomB);

    // 监听 B1 是否收到 Room A 的广播
    let leakedToB = false;
    const bListener = (data: WebSocket.RawData) => {
      const msg: WSMessage = JSON.parse(data.toString());
      if (msg.type === 'ROOM_INFO_SYNC') {
        const p = msg.payload as { roomId: string };
        if (p.roomId === roomA) leakedToB = true;
      }
    };
    wsB1.on('message', bListener);

    // A2 加入 Room A 触发 Room A 内广播
    const wsA2 = await connectClient();
    wsA2.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId: roomA } }));
    await waitForMessage(wsA1, (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { humanCount: number }).humanCount === 2);

    // 等待 300ms 验证 B1 没有接收到 A 的事件
    await new Promise((r) => setTimeout(r, 300));
    expect(leakedToB).toBe(false);

    wsB1.off('message', bListener);
    wsA1.close();
    wsA2.close();
    wsB1.close();
  });

  it('权限安全：非房主好友尝试发送 START_GAME 必须被拒绝并返回 SYSTEM_ERROR', async () => {
    const wsHost = await connectClient();
    const wsGuest = await connectClient();
    const roomId = `room-perm-${Date.now()}`;

    // 房主加入 (1号)
    wsHost.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId } }));
    await waitForMessage(wsHost, (m) => m.type === 'ROOM_INFO_SYNC');

    // 访客加入 (2号)
    wsGuest.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId } }));
    await waitForMessage(wsGuest, (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { myPlayerId: number }).myPlayerId === 2);

    // 访客非法尝试启动游戏
    wsGuest.send(JSON.stringify({ type: 'START_GAME', payload: { language: 'zh-CN' } }));

    // 访客应收到 FORBIDDEN 报错
    const errorMsg = await waitForMessage(wsGuest, (m) => m.type === 'SYSTEM_ERROR');
    expect((errorMsg.payload as { code: string }).code).toBe('FORBIDDEN');
    expect((errorMsg.payload as { message: string }).message).toContain('只有房主');

    wsHost.close();
    wsGuest.close();
  });

  it('抗畸形攻击测试：发送非法 JSON 与乱码字符串时，连接保持稳定且服务不崩溃', async () => {
    const ws = await connectClient();

    // 发送非合法 JSON 报文
    ws.send('<<<MALFORMED_NON_JSON_DATA>>>');
    ws.send('{ invalidJson: true,');
    ws.send('');

    // 发送合法 JSON 但未知类型的报文
    ws.send(JSON.stringify({ type: 'UNKNOWN_EVIL_EVENT', payload: { exploit: true } }));

    // 等待 200ms 后验证该连接依然健康可用
    await new Promise((r) => setTimeout(r, 200));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // 发送正常协议消息确认服务端仍能正常响应
    ws.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId: 'test-healthy' } }));
    const resp = await waitForMessage(ws, (m) => m.type === 'ROOM_INFO_SYNC');
    expect(resp).toBeDefined();

    ws.close();
  });

  it('底层脱敏抓包防御：未结束对局中，GAME_STATE_SYNC 广播中其他玩家底牌必须被脱敏', async () => {
    const ws1 = await connectClient();
    const ws2 = await connectClient();
    const roomId = `room-mask-${Date.now()}`;

    ws1.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId } }));
    await waitForMessage(ws1, (m) => m.type === 'ROOM_INFO_SYNC');

    ws2.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId } }));
    await waitForMessage(ws2, (m) => m.type === 'ROOM_INFO_SYNC');

    // 房主 1号开启游戏
    ws1.send(JSON.stringify({ type: 'START_GAME', payload: { language: 'zh-CN' } }));

    // 访客 2号监听下发的 GAME_STATE_SYNC
    const syncMsg = await waitForMessage(ws2, (m) => m.type === 'GAME_STATE_SYNC');
    const state = (syncMsg.payload as { state: { phase: string; players: Array<{ id: number; role: string }> } }).state;

    expect(state.phase).toBe('NIGHT_START');

    // 验证 2号玩家收到的广播中：除自己以外的其他非狼人底牌必须被脱敏为 VILLAGER
    const otherPlayers = state.players.filter((p) => p.id !== 2);
    // 如果 2号不是狼人，所有其他玩家的 role 必须全部是 VILLAGER 脱敏占位
    const myPlayer = state.players.find((p) => p.id === 2);
    if (myPlayer?.role !== 'WEREWOLF') {
      expect(otherPlayers.every((p) => p.role === 'VILLAGER')).toBe(true);
    }

    ws1.close();
    ws2.close();
  });
});
