import { useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playAudioBase64 = useCallback((base64: string, onEnded?: () => void) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    try {
      const audioUrl = `data:audio/mp3;base64,${base64}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        currentAudioRef.current = null;
        onEnded?.();
      };

      audio.onerror = () => {
        currentAudioRef.current = null;
        onEnded?.();
      };

      audio.play().catch(() => {
        // 用户尚未与页面产生交互时可能会静音拦截，安全回退
        onEnded?.();
      });
    } catch {
      onEnded?.();
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  return { playAudioBase64, stopAudio };
}
