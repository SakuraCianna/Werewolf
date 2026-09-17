declare module '@bestcodes/edge-tts/dist/index.mjs' {
  export interface GenerateSpeechOptions {
    text: string;
    voice?: string;
    rate?: string;
    volume?: string;
    pitch?: string;
  }
  export function generateSpeech(options: GenerateSpeechOptions): Promise<Buffer>;
}
