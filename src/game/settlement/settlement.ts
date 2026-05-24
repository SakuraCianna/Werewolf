export interface PlayerReview {
  playerName: string;
  scores: {
    performance: number;
    logic: number;
    operation: number;
  };
  comment: string;
  tags: string[];
}

export interface SettlementReport {
  players: PlayerReview[];
  summary: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Settlement player review must be an object');
  }

  return value as Record<string, unknown>;
}

function score(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Settlement scores must be numbers');
  }

  return Math.max(0, Math.min(10, value));
}

export function normalizeSettlementReport(raw: Record<string, unknown>): SettlementReport {
  if (!Array.isArray(raw.players)) {
    throw new Error('Settlement report must include players');
  }

  return {
    summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary : '本局暂无总评。',
    players: raw.players.map((item) => {
      const record = asRecord(item);
      return {
        playerName: typeof record.playerName === 'string' && record.playerName.trim() ? record.playerName : '未知玩家',
        scores: {
          performance: score(record.performance),
          logic: score(record.logic),
          operation: score(record.operation),
        },
        comment: typeof record.comment === 'string' && record.comment.trim() ? record.comment : '暂无评价。',
        tags: Array.isArray(record.tags) ? record.tags.map(String).filter(Boolean) : [],
      };
    }),
  };
}
