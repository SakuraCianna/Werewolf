import { useState, useRef, useCallback } from 'react';

interface AudioRecorderOptions {
  onAudioChunk: (base64Chunk: string) => void;
}

export function useAudioRecorder({ onAudioChunk }: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const onAudioChunkRef = useRef(onAudioChunk);
  onAudioChunkRef.current = onAudioChunk;

  const startRecording = useCallback(async () => {
    // 防重入幂等守卫
    if (audioContextRef.current || mediaStreamRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      // 使用现代 W3C 标准 AudioWorklet (完全替代已弃用的 ScriptProcessorNode)
      const workletSource = `
        class AudioRecorderWorklet extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0];
            if (input && input[0] && input[0].length > 0) {
              this.port.postMessage(input[0]);
            }
            return true;
          }
        }
        registerProcessor('audio-recorder-worklet', AudioRecorderWorklet);
      `;

      const blob = new Blob([workletSource], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await audioCtx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const workletNode = new AudioWorkletNode(audioCtx, 'audio-recorder-worklet');
      workletNodeRef.current = workletNode;

      workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        const inputData = e.data;
        // 降采样至 16000Hz PCM 16-bit
        const downsampled = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64 = bufferToBase64(pcm16);
        onAudioChunkRef.current(base64);
      };

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(workletNode);

      // 连接静音增益节点以维持处理管道运转，同时避免麦克风声音本地回放形成啸叫
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      workletNode.connect(muteGain);
      muteGain.connect(audioCtx.destination);

      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access not granted or failed:', err);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.close();
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return { isRecording, startRecording, stopRecording };
}

// ============= 音频数据转换工具 =============

function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (inputSampleRate === outputSampleRate) return buffer;
  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function bufferToBase64(buffer: Int16Array): string {
  const bytes = new Uint8Array(buffer.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
