import { describe, it, expect, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import { RoomManager } from '../src/game/RoomManager.js';
import { GameEngine } from '../src/game/GameEngine.js';

describe('RoomManager 房间管理与安全拦截测试', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = RoomManager.getInstance();
  });

  function createMockWs(): WebSocket {
    return {
      readyState: 1, // WebSocket.OPEN
      send: () => {},
      close: () => {},
      on: () => {},
    } as unknown as WebSocket;
  }

  it('首位玩家加入房间自动成为房主并分配 1 号席位', () => {
    const ws1 = createMockWs();
    const roomId = `test-room-${Date.now()}`;
    const res = roomManager.joinRoom(ws1, roomId, '房主爱丽丝');

    expect(res.success).toBe(true);
    expect(res.playerId).toBe(1);
    expect(res.isHost).toBe(true);

    const session = roomManager.getRoom(roomId);
    expect(session).toBeDefined();
    expect(session?.clients.size).toBe(1);
    expect(session?.getHumanPlayers()[0].name).toBe('房主爱丽丝');
  });

  it('好友通过房间链接加入应分配递增席位 (2~6号) 且非房主', () => {
    const roomId = `test-room-friends-${Date.now()}`;
    const ws1 = createMockWs();
    const ws2 = createMockWs();
    const ws3 = createMockWs();

    const res1 = roomManager.joinRoom(ws1, roomId);
    const res2 = roomManager.joinRoom(ws2, roomId, '好友鲍勃');
    const res3 = roomManager.joinRoom(ws3, roomId, '好友查理');

    expect(res1.playerId).toBe(1);
    expect(res1.isHost).toBe(true);

    expect(res2.playerId).toBe(2);
    expect(res2.isHost).toBe(false);
    expect(res2.success).toBe(true);

    expect(res3.playerId).toBe(3);
    expect(res3.isHost).toBe(false);

    const session = roomManager.getRoom(roomId)!;
    expect(session.clients.size).toBe(3);
    expect(session.getHumanPlayers().length).toBe(3);
  });

  it('安全拦截：房间达到 6 人满员时，第 7 名玩家加入必须被拦截并返回 ROOM_FULL', () => {
    const roomId = `test-room-full-${Date.now()}`;
    const wsList: WebSocket[] = [];

    // 填满 6 个席位
    for (let i = 1; i <= 6; i++) {
      const ws = createMockWs();
      wsList.push(ws);
      const res = roomManager.joinRoom(ws, roomId);
      expect(res.success).toBe(true);
      expect(res.playerId).toBe(i);
    }

    // 第 7 人加入
    const ws7 = createMockWs();
    const res7 = roomManager.joinRoom(ws7, roomId);

    expect(res7.success).toBe(false);
    expect(res7.reason).toBe('ROOM_FULL');
    expect(res7.message).toContain('6/6');
  });

  it('安全拦截：对局已经开启时 (非 IDLE/GAME_OVER 状态)，禁止外部玩家加入并返回 GAME_ALREADY_STARTED', () => {
    const roomId = `test-room-started-${Date.now()}`;
    const ws1 = createMockWs();
    const res1 = roomManager.joinRoom(ws1, roomId);
    expect(res1.success).toBe(true);

    const session = roomManager.getRoom(roomId)!;
    // 启动游戏转入夜间阶段
    session.engine.start('zh-CN');
    expect(session.engine.getState().phase).toBe('NIGHT_START');

    // 好友此时尝试点链接切入
    const ws2 = createMockWs();
    const res2 = roomManager.joinRoom(ws2, roomId);

    expect(res2.success).toBe(false);
    expect(res2.reason).toBe('GAME_ALREADY_STARTED');
    expect(res2.message).toContain('已在进行中');
  });

  it('玩家离开房间后席位释放，房主离开后自动将剩余最早席位玩家迁移晋升为新房主', () => {
    const roomId = `test-room-leave-${Date.now()}`;
    const ws1 = createMockWs();
    const ws2 = createMockWs();

    roomManager.joinRoom(ws1, roomId, '房主');
    roomManager.joinRoom(ws2, roomId, '二号');

    const session = roomManager.getRoom(roomId)!;
    expect(session.clients.size).toBe(2);

    // 房主断开连接
    const left = roomManager.leaveRoom(ws1);
    expect(left?.roomId).toBe(roomId);
    expect(session.clients.size).toBe(1);

    // 2 号玩家自动晋升为房主
    const meta2 = session.getMeta(ws2);
    expect(meta2?.isHost).toBe(true);
    expect(session.engine.getState().hostPlayerId).toBe(2);

    // 关键防篡夺验证：新玩家 ws3 补入空出的 1 号席位，不能篡夺 2 号玩家的房主地位
    const ws3 = createMockWs();
    const res3 = roomManager.joinRoom(ws3, roomId, '新进三号');
    expect(res3.success).toBe(true);
    expect(res3.playerId).toBe(1); // 补入 1 号空位
    expect(res3.isHost).toBe(false); // 房主依然属于 2 号，不能被篡夺！
    expect(session.engine.getState().hostPlayerId).toBe(2);
  });
});
