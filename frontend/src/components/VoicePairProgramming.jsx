/**
 * VoicePairProgramming.jsx - 语音结对编程组件
 * 支持语音输入和语音输出
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause } from 'lucide-react';

const VoicePairProgramming = ({ onVoiceInput, onToggleVoiceOutput }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speechRate, setSpeechRate] = useState(1);
  const [supportStatus, setSupportStatus] = useState({ recognition: false, synthesis: false });
  const [voices, setVoices] = useState([]);
  const [error, setError] = useState(null);

  // 动态导入 voiceService
  const [voiceService, setVoiceService] = useState(null);

  useEffect(() => {
    import('../services/voiceService').then(module => {
      const service = module.default;
      setVoiceService(service);
      setSupportStatus(service.getSupportStatus());
      
      // 加载语音列表
      const loadVoices = () => {
        const availableVoices = service.getVoices();
        setVoices(availableVoices);
        
        // 默认选择中文语音
        const chineseVoice = availableVoices.find(voice => voice.lang.includes('zh'));
        if (chineseVoice) {
          setSelectedVoice(chineseVoice);
        }
      };
      
      loadVoices();
      
      // 监听语音列表变化
      if (service.isSynthesisSupported) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    });
  }, []);

  // 开始/停止语音识别
  const toggleListening = useCallback(() => {
    if (!voiceService) return;

    try {
      if (isListening) {
        voiceService.stopListening();
        setIsListening(false);
      } else {
        voiceService.setCallbacks({
          onResult: ({ final, interim }) => {
            if (final) {
              setFinalText(prev => prev + final);
              if (onVoiceInput) {
                onVoiceInput(final);
              }
            }
            setInterimText(interim);
          },
          onError: (error) => {
            setError(`语音识别错误: ${error}`);
            setIsListening(false);
          },
          onEnd: () => {
            setIsListening(false);
          }
        });
        
        voiceService.startListening();
        setIsListening(true);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [isListening, voiceService, onVoiceInput]);

  // 切换语音输出
  const toggleVoiceOutput = useCallback(() => {
    const newState = !voiceOutputEnabled;
    setVoiceOutputEnabled(newState);
    if (onToggleVoiceOutput) {
      onToggleVoiceOutput(newState);
    }
  }, [voiceOutputEnabled, onToggleVoiceOutput]);

  // 朗读文本
  const speak = useCallback((text) => {
    if (!voiceService || !voiceOutputEnabled) return;

    try {
      voiceService.speak(text, {
        voice: selectedVoice,
        rate: speechRate,
        lang: 'zh-CN'
      });
    } catch (err) {
      setError(`语音合成错误: ${err.message}`);
    }
  }, [voiceService, voiceOutputEnabled, selectedVoice, speechRate]);

  // 停止朗读
  const stopSpeaking = useCallback(() => {
    if (!voiceService) return;
    voiceService.stopSpeaking();
  }, [voiceService]);

  // 清除文本
  const clearText = useCallback(() => {
    setFinalText('');
    setInterimText('');
  }, []);

  // 监听 AI 回复并朗读
  useEffect(() => {
    // 这个函数会在父组件调用
    window.speakAIResponse = speak;
    window.stopAISpeaking = stopSpeaking;
  }, [speak, stopSpeaking]);

  if (!supportStatus.recognition && !supportStatus.synthesis) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
        <p className="text-yellow-400 text-sm">
          您的浏览器不支持语音功能。请使用 Chrome、Edge 或 Safari 浏览器。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4 space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-medium text-gray-200">语音结对编程</h3>
        </div>
        <div className="flex items-center gap-2">
          {supportStatus.synthesis && (
            <button
              onClick={toggleVoiceOutput}
              className={`p-2 rounded-lg transition-colors ${
                voiceOutputEnabled
                  ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
              title={voiceOutputEnabled ? '关闭语音输出' : '开启语音输出'}
            >
              {voiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* 语音识别控制 */}
      <div className="space-y-3">
        {supportStatus.recognition && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleListening}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5" />
                  停止录音
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  开始录音
                </>
              )}
            </button>
            
            {finalText && (
              <button
                onClick={clearText}
                className="px-4 py-3 rounded-lg bg-gray-700/50 text-gray-400 hover:bg-gray-700 transition-colors"
                title="清除文本"
              >
                清除
              </button>
            )}
          </div>
        )}

        {/* 识别结果 */}
        {(finalText || interimText) && (
          <div className="bg-gray-900/50 rounded-lg p-3 min-h-[100px]">
            <div className="text-sm text-gray-300">
              {finalText}
              {interimText && (
                <span className="text-gray-500">
                  {interimText}
                </span>
              )}
            </div>
            {isListening && interimText && (
              <div className="flex items-center gap-2 mt-2 text-xs text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                正在聆听...
              </div>
            )}
          </div>
        )}
      </div>

      {/* 设置面板 */}
      {showSettings && supportStatus.synthesis && (
        <div className="bg-gray-900/50 rounded-lg p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-200">语音设置</h4>
          
          {/* 语音选择 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">选择语音</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const voice = voices.find(v => v.name === e.target.value);
                setSelectedVoice(voice);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
            >
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* 语速控制 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-400">语速: {speechRate.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* 测试语音 */}
          <button
            onClick={() => speak('你好，这是语音测试。')}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            测试语音
          </button>
        </div>
      )}

      {/* 使用说明 */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• 点击"开始录音"按钮开始语音输入</p>
        <p>• 开启语音输出后，AI 回复会自动朗读</p>
        <p>• 在设置中可以调整语音和语速</p>
      </div>
    </div>
  );
};

export default VoicePairProgramming;