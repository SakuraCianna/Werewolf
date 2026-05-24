import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders fixed room layout with view switch button and status feed', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
    expect(screen.getByLabelText('圆桌座位区')).toBeInTheDocument();
    expect(screen.getByLabelText('游戏消息状态区')).toBeInTheDocument();
    expect(screen.getByText('第二天 · 叶岚发言')).toBeInTheDocument();
  });
});
