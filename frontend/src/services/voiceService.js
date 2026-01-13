/**
 * 语音服务 - 语音识别和语音合成
 * 使用浏览器内置的 Web Speech API
 */

class VoiceService {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;
    
    // 检查浏览器支持
    this.isRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    this.isSynthesisSupported = 'speechSynthesis' in window;
    
    if (this.isRecognitionSupported) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'zh-CN';
      
      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (this.onResult) {
          this.onResult({
            final: finalTranscript,
            interim: interimTranscript
          });
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        if (this.onError) {
          this.onError(event.error);
        }
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) {
          this.onEnd();
        }
      };
    }
  }
  
  /**
   * 开始语音识别
   */
  startListening() {
    if (!this.isRecognitionSupported) {
      throw new Error('浏览器不支持语音识别');
    }
    
    if (this.isListening) {
      return;
    }
    
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('启动语音识别失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止语音识别
   */
  stopListening() {
    if (!this.isRecognitionSupported) {
      return;
    }
    
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
  
  /**
   * 语音合成（朗读文本）
   */
  speak(text, options = {}) {
    if (!this.isSynthesisSupported) {
      throw new Error('浏览器不支持语音合成');
    }
    
    // 停止当前正在播放的语音
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音选项
    utterance.lang = options.lang || 'zh-CN';
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;
    
    // 选择语音
    if (options.voice) {
      utterance.voice = options.voice;
    } else {
      // 尝试选择中文语音
      const voices = this.synthesis.getVoices();
      const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
    }
    
    utterance.onstart = () => {
      this.isSpeaking = true;
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
    };
    
    utterance.onerror = (event) => {
      console.error('语音合成错误:', event.error);
      this.isSpeaking = false;
    };
    
    this.synthesis.speak(utterance);
  }
  
  /**
   * 停止语音合成
   */
  stopSpeaking() {
    if (!this.isSynthesisSupported) {
      return;
    }
    
    this.synthesis.cancel();
    this.isSpeaking = false;
  }
  
  /**
   * 获取可用的语音列表
   */
  getVoices() {
    if (!this.isSynthesisSupported) {
      return [];
    }
    
    return this.synthesis.getVoices();
  }
  
  /**
   * 设置语音识别语言
   */
  setLanguage(lang) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
  
  /**
   * 设置回调函数
   */
  setCallbacks({ onResult, onError, onEnd }) {
    this.onResult = onResult;
    this.onError = onError;
    this.onEnd = onEnd;
  }
  
  /**
   * 获取支持状态
   */
  getSupportStatus() {
    return {
      recognition: this.isRecognitionSupported,
      synthesis: this.isSynthesisSupported
    };
  }
}

// 创建单例
const voiceService = new VoiceService();

export default voiceService;