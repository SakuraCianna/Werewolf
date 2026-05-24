import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the AI Werewolf lobby copy', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'AI 狼人杀' })).toBeInTheDocument();
  expect(screen.getByText('选择 6-12 人后开始一局 AI 狼人杀观战。')).toBeInTheDocument();
});
