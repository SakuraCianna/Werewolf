import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders fixed room layout with view switch button and status feed', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
    expect(screen.getByLabelText('圆桌座位区')).toBeInTheDocument();
    expect(screen.getByLabelText('游戏消息状态区')).toBeInTheDocument();
    expect(screen.getByText('第二天 · 叶岚发言')).toBeInTheDocument();
  });

  it('toggles view when clicking the switch button', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '切换到上帝视角' }));

    expect(screen.getByRole('button', { name: '切换到观众视角' })).toBeInTheDocument();
  });

  it('toggles view when Space is pressed outside interactive controls', () => {
    render(<App />);

    fireEvent.keyDown(window, { code: 'Space' });

    expect(screen.getByRole('button', { name: '切换到观众视角' })).toBeInTheDocument();
  });

  it('does not toggle view when Space is pressed from the switch button', () => {
    render(<App />);
    const switchButton = screen.getByRole('button', { name: '切换到上帝视角' });

    switchButton.focus();
    fireEvent.keyDown(switchButton, { code: 'Space' });

    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
  });

  it('does not toggle view when Space is pressed from an input', () => {
    render(<App />);
    const input = document.createElement('input');
    document.body.appendChild(input);

    input.focus();
    fireEvent.keyDown(input, { code: 'Space' });

    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
    input.remove();
  });

  it('does not toggle view when Space is pressed from editable content', () => {
    render(<App />);
    const editable = document.createElement('div');
    editable.tabIndex = 0;
    editable.setAttribute('contenteditable', 'true');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    document.body.appendChild(editable);

    editable.focus();
    fireEvent.keyDown(editable, { code: 'Space' });

    expect(screen.getByRole('button', { name: '切换到上帝视角' })).toBeInTheDocument();
    editable.remove();
  });

  it('allows Space to toggle view from non-editable contenteditable containers', () => {
    render(<App />);
    const nonEditable = document.createElement('div');
    nonEditable.tabIndex = 0;
    nonEditable.setAttribute('contenteditable', 'false');
    Object.defineProperty(nonEditable, 'isContentEditable', { value: false });
    document.body.appendChild(nonEditable);

    nonEditable.focus();
    fireEvent.keyDown(nonEditable, { code: 'Space' });

    expect(screen.getByRole('button', { name: '切换到观众视角' })).toBeInTheDocument();
    nonEditable.remove();
  });

  it('removes the Space key listener after unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<App />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(() => fireEvent.keyDown(window, { code: 'Space' })).not.toThrow();
    removeEventListenerSpy.mockRestore();
  });
});
