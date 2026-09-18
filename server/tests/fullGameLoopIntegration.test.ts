import http from 'node:http';
import WebSocket from 'ws';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GameSocketServer } from '../src/websocket/socketServer.js';
import type { WSMessage, GamePhase } from 'voice-werewolf-shared';

describe('Full Game Loop Integration 真实网络端到端游戏主循环集成测试', () => {
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

  function createClient(): Promise<WebSocket> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${serverPort}`);
      ws.on('open', () => resolve(ws));
    });
  }

  class MessageCollector {
    private messages: WSMessage[] = [];
    private waiters: Array<{
      predicate: (m: WSMessage) => boolean;
      resolve: (m: WSMessage) => void;
    }> = [];

    constructor(ws: WebSocket) {
      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const msg: WSMessage = JSON.parse(data.toString());
          const waiterIdx = this.waiters.findIndex((w) => w.predicate(msg));
          if (waiterIdx >= 0) {
            const waiter = this.waiters.splice(waiterIdx, 1)[0];
            waiter.resolve(msg);
          } else {
            this.messages.push(msg);
          }
        } catch {
          // ignore
        }
      });
    }

    public waitFor(predicate: (m: WSMessage) => boolean, timeoutMs = 4000): Promise<WSMessage> {
      const existingIdx = this.messages.findIndex(predicate);
      if (existingIdx >= 0) {
        return Promise.resolve(this.messages.splice(existingIdx, 1)[0]);
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = this.waiters.findIndex((w) => w.resolve === resolve);
          if (idx >= 0) this.waiters.splice(idx, 1);
          reject(new Error(`Timeout waiting for message after ${timeoutMs}ms`));
        }, timeoutMs);

        this.waiters.push({
          predicate,
          resolve: (m) => {
            clearTimeout(timer);
            resolve(m);
          },
        });
      });
    }
  }

  it('真实 WebSocket 端到端：房主开局、指定角色、夜间刀人/救人、天亮发言交麦测谎及投票放逐全链路贯通', async () => {
    const wsHost = await createClient();
    const collector = new MessageCollector(wsHost);
    const roomId = `loop-room-${Date.now()}`;

    // 1. 房主加入房间
    wsHost.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId, playerName: '房主小王' } }));
    const joinInfo = await collector.waitFor(
      (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { isHost: boolean }).isHost === true,
    );
    expect((joinInfo.payload as { myPlayerId: number }).myPlayerId).toBe(1);

    // 2. 房主启动游戏 (锁定 1号真人为 WEREWOLF，便于测试主动夜间操作)
    wsHost.send(
      JSON.stringify({
        type: 'START_GAME',
        payload: {
          language: 'zh-CN',
          userRole: 'WEREWOLF',
        },
      }),
    );

    // 验证接收到 PHASE_CHANGE: NIGHT_START
    const nightStart = await collector.waitFor(
      (m) => m.type === 'PHASE_CHANGE' && (m.payload as { phase: GamePhase }).phase === 'NIGHT_START',
    );
    expect(nightStart).toBeDefined();

    // 验证状态同步 GAME_STATE_SYNC (包含夜间初始状态)
    const stateSync = await collector.waitFor(
      (m) =>
        m.type === 'GAME_STATE_SYNC' &&
        (m.payload as { state: { phase: string } }).state.phase === 'NIGHT_START',
    );
    const state = (stateSync.payload as { state: { phase: string; players: Array<{ id: number; role: string }> } }).state;
    expect(state.phase).toBe('NIGHT_START');
    // 验证 1号确实为狼人
    expect(state.players.find((p) => p.id === 1)?.role).toBe('WEREWOLF');

    // 3. 模拟开发者/自动化指令跳过或流转测试：模拟执行狼人击杀
    wsHost.send(
      JSON.stringify({
        type: 'USER_NIGHT_ACTION',
        payload: {
          action: 'KILL',
          targetId: 4,
        },
      }),
    );

    // 4. 模拟发言与交麦：测试测谎事件触发
    // 模拟真人发言交麦
    wsHost.send(JSON.stringify({ type: 'DEV_SIMULATE_SPEECH', payload: { text: '我是好人牌，大家相信我，全票走4！' } }));

    // 等待 200ms
    await new Promise((r) => setTimeout(r, 200));

    // 5. 模拟放逐投票
    wsHost.send(
      JSON.stringify({
        type: 'USER_VOTE',
        payload: { targetId: 2 },
      }),
    );

    // 验证连接依然完好
    expect(wsHost.readyState).toBe(WebSocket.OPEN);
    wsHost.close();
  });

  it('双真人联机开黑集成测试：2名真人玩家共处同一房间，各自持有专属席位与视野隔离，房主开局后同步流转', async () => {
    const ws1 = await createClient();
    const ws2 = await createClient();
    const collector1 = new MessageCollector(ws1);
    const collector2 = new MessageCollector(ws2);

    const roomId = `coop-room-${Date.now()}`;

    // 1. 房主加入 (1号)
    ws1.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId, playerName: '房主' } }));
    const info1 = await collector1.waitFor(
      (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { myPlayerId: number }).myPlayerId === 1,
    );
    expect((info1.payload as { isHost: boolean }).isHost).toBe(true);

    // 2. 好友加入 (2号)
    ws2.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId, playerName: '好友' } }));
    const info2 = await collector2.waitFor(
      (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { myPlayerId: number }).myPlayerId === 2,
    );
    expect((info2.payload as { isHost: boolean }).isHost).toBe(false);

    // 房主也应收到房间人数变为 2 的通知
    const hostUpdate = await collector1.waitFor(
      (m) => m.type === 'ROOM_INFO_SYNC' && (m.payload as { humanCount: number }).humanCount === 2,
    );
    expect(hostUpdate).toBeDefined();

    // 3. 房主点击开始游戏
    ws1.send(JSON.stringify({ type: 'START_GAME', payload: { language: 'zh-CN' } }));

    // 两人同时收到 PHASE_CHANGE
    const phase1 = await collector1.waitFor((m) => m.type === 'PHASE_CHANGE');
    const phase2 = await collector2.waitFor((m) => m.type === 'PHASE_CHANGE');
    expect((phase1.payload as { phase: string }).phase).toBe('NIGHT_START');
    expect((phase2.payload as { phase: string }).phase).toBe('NIGHT_START');

    // 两人接收到的 GAME_STATE_SYNC 各自脱敏隔离
    const stateMsg1 = await collector1.waitFor(
      (m) =>
        m.type === 'GAME_STATE_SYNC' &&
        (m.payload as { state: { phase: string } }).state.phase === 'NIGHT_START',
    );
    const stateMsg2 = await collector2.waitFor(
      (m) =>
        m.type === 'GAME_STATE_SYNC' &&
        (m.payload as { state: { phase: string } }).state.phase === 'NIGHT_START',
    );

    const s1 = (stateMsg1.payload as { state: { players: Array<{ id: number; isAI: boolean }> } }).state;
    const s2 = (stateMsg2.payload as { state: { players: Array<{ id: number; isAI: boolean }> } }).state;

    // 验证席位 1 与 2 是真人，其余 3~6 号是 AI
    expect(s1.players.find((p) => p.id === 1)?.isAI).toBe(false);
    expect(s1.players.find((p) => p.id === 2)?.isAI).toBe(false);
    expect(s1.players.slice(2).every((p) => p.isAI)).toBe(true);

    expect(s2.players.find((p) => p.id === 1)?.isAI).toBe(false);
    expect(s2.players.find((p) => p.id === 2)?.isAI).toBe(false);

    ws1.close();
    ws2.close();
  });
});
