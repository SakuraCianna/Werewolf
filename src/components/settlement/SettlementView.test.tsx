import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SettlementReport } from '../../game/settlement/settlement';
import { SettlementView } from './SettlementView';

const report: SettlementReport = {
  summary: '狼人阵营获胜，关键在于夏眠白天成功带偏票型。',
  players: [
    {
      playerName: '夏眠',
      scores: { performance: 9, logic: 8, operation: 9 },
      comment: '伪装稳定，夜间刀法果断。',
      tags: ['最佳伪装', '关键操作'],
    },
  ],
};

describe('SettlementView', () => {
  it('renders summary and three judge score categories', () => {
    render(<SettlementView report={report} onReturnLobby={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '赛后复盘' })).toBeInTheDocument();
    expect(screen.getByText('狼人阵营获胜，关键在于夏眠白天成功带偏票型。')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '夏眠' })).toBeInTheDocument();
    expect(screen.getByText('表演评分：9/10')).toBeInTheDocument();
    expect(screen.getByText('逻辑评分：8/10')).toBeInTheDocument();
    expect(screen.getByText('游戏操作评分：9/10')).toBeInTheDocument();
    expect(screen.getByText('最佳伪装、关键操作')).toBeInTheDocument();
  });

  it('notifies the app when returning to lobby', () => {
    const onReturnLobby = vi.fn();
    render(<SettlementView report={report} onReturnLobby={onReturnLobby} />);

    fireEvent.click(screen.getByRole('button', { name: '返回大厅' }));

    expect(onReturnLobby).toHaveBeenCalledTimes(1);
  });
});
