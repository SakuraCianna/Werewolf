export class TTSService {
  /**
   * 将文本转为 Base64 音频 (优先尝试 Edge-TTS，若失败则安全回退由前端静音/WebSpeech兜底)
   */
  public static async synthesizeToBase64(
    text: string,
    voiceId: string,
  ): Promise<string | null> {
    try {
      // 动态导入以避免构建期依赖阻断
      const edgeTTS = await import('@bestcodes/edge-tts/dist/index.mjs');
      const buffer = await edgeTTS.generateSpeech({
        text,
        voice: voiceId,
      });

      if (buffer && buffer.length > 0) {
        return buffer.toString('base64');
      }
    } catch {
      // 微软 Edge-TTS 临时网络波动或 403 限流时，安全优雅降级
    }

    return null;
  }
}
