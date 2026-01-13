import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, Brain, AlertCircle, HelpCircle, Check } from 'lucide-react';
import { transcribeWithWhisper } from '../utils/whisper';

export default function MicButton({ onTranscript, className = '' }) {
  const [state, setState] = useState('idle'); // idle, recording, transcribing, processing
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const lastTapRef = useRef(0);
  
  // Check microphone support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        setError('您的浏览器不支持麦克风功能。请使用 Chrome、Edge 或 Safari 浏览器。');
        return;
      }
      
      // Additional check for secure context
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setIsSupported(false);
        setError('麦克风需要 HTTPS 连接。请使用安全连接。');
        return;
      }
      
      // Check if we have permission
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permissionStatus.state === 'denied') {
          setPermissionDenied(true);
          setError('麦克风权限被拒绝。请在浏览器设置中允许麦克风访问。');
        }
      } catch (e) {
        // Permissions API not supported, continue
      }
      
      setIsSupported(true);
    };
    
    checkSupport();
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      setError(null);
      setPermissionDenied(false);
      chunksRef.current = [];

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持麦克风访问。请使用 Chrome、Edge 或 Safari 浏览器。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Recording stopped, creating blob...');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Start transcribing
        setState('transcribing');
        
        // Check if we're in an enhancement mode
        const whisperMode = window.localStorage.getItem('whisperMode') || 'default';
        const isEnhancementMode = whisperMode === 'prompt' || whisperMode === 'vibe' || whisperMode === 'instructions' || whisperMode === 'architect';
        
        // Set up a timer to switch to processing state for enhancement modes
        let processingTimer;
        if (isEnhancementMode) {
          processingTimer = setTimeout(() => {
            setState('processing');
          }, 2000); // Switch to processing after 2 seconds
        }
        
        try {
          const text = await transcribeWithWhisper(blob);
          if (text && onTranscript) {
            onTranscript(text);
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setError('语音识别失败，请重试。');
        } finally {
          if (processingTimer) {
            clearTimeout(processingTimer);
          }
          setState('idle');
        }
      };

      recorder.start();
      setState('recording');
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      
      // Provide specific error messages based on error type
      let errorMessage = '麦克风访问失败';
      let showTooltip = true;
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = '麦克风权限被拒绝。请点击浏览器地址栏的锁图标，允许麦克风访问。';
        setPermissionDenied(true);
      } else if (err.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备。请检查您的音频设备是否已连接。';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = '您的浏览器不支持麦克风功能。请使用 Chrome、Edge 或 Safari 浏览器。';
      } else if (err.name === 'NotReadableError') {
        errorMessage = '麦克风正被其他应用占用。请关闭其他使用麦克风的应用程序。';
      } else if (err.message.includes('HTTPS')) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setShowErrorTooltip(showTooltip);
      setState('idle');
    }
  };

  // Request permission
  const requestPermission = async () => {
    try {
      setError(null);
      setPermissionDenied(false);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted
      setError('麦克风权限已获取！请再次点击麦克风按钮开始录音。');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('麦克风权限被拒绝。请手动在浏览器设置中允许麦克风访问。');
        setPermissionDenied(true);
      } else {
        setError(err.message);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      // Don't set state here - let the onstop handler do it
    } else {
      // If recorder isn't in recording state, force cleanup
      console.log('Recorder not in recording state, forcing cleanup');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setState('idle');
    }
  };

  // Handle button click
  const handleClick = (e) => {
    // Prevent double firing on mobile
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Don't proceed if microphone is not supported
    if (!isSupported) {
      return;
    }
    
    // Debounce for mobile double-tap issue
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      console.log('Ignoring rapid tap');
      return;
    }
    lastTapRef.current = now;
    
    console.log('Button clicked, current state:', state);
    
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
    // Do nothing if transcribing or processing
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Button appearance based on state
  const getButtonAppearance = () => {
    if (!isSupported) {
      return {
        icon: <Mic className="w-5 h-5" />,
        className: 'bg-gray-400 cursor-not-allowed',
        disabled: true
      };
    }
    
    switch (state) {
      case 'recording':
        return {
          icon: <Mic className="w-5 h-5 text-white" />,
          className: 'bg-red-500 hover:bg-red-600 animate-pulse',
          disabled: false
        };
      case 'transcribing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          className: 'bg-blue-500 hover:bg-blue-600',
          disabled: true
        };
      case 'processing':
        return {
          icon: <Brain className="w-5 h-5 animate-pulse" />,
          className: 'bg-purple-500 hover:bg-purple-600',
          disabled: true
        };
      default: // idle
        return {
          icon: <Mic className="w-5 h-5" />,
          className: 'bg-gray-700 hover:bg-gray-600',
          disabled: false
        };
    }
  };

  const { icon, className: buttonClass, disabled } = getButtonAppearance();

  return (
    <div className="relative">
      <button
        type="button"
        style={{
          backgroundColor: state === 'recording' ? '#ef4444' : 
                          state === 'transcribing' ? '#3b82f6' : 
                          state === 'processing' ? '#a855f7' :
                          error ? '#dc2626' : '#374151'
        }}
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-full
          text-white transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          dark:ring-offset-gray-800
          touch-action-manipulation
          ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}
          ${state === 'recording' ? 'animate-pulse' : ''}
          ${error ? 'animate-shake' : ''}
          hover:opacity-90
          ${className}
        `}
        onClick={handleClick}
        disabled={disabled}
        title={error ? '点击查看错误详情' : state === 'recording' ? '停止录音' : '开始录音'}
      >
        {error ? <AlertCircle className="w-5 h-5" /> : icon}
      </button>
      
      {/* Error tooltip */}
      {error && showErrorTooltip && (
        <div 
          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
                  bg-red-600 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50
                  shadow-lg max-w-xs"
          onClick={() => setShowErrorTooltip(false)}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">麦克风错误</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
          {permissionDenied && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                requestPermission();
              }}
              className="mt-2 w-full bg-white text-red-600 px-2 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              请求权限
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowErrorTooltip(false);
            }}
            className="mt-2 w-full bg-red-700 text-white px-2 py-1 rounded text-xs hover:bg-red-800 transition-colors"
          >
            关闭
          </button>
        </div>
      )}
      
      {/* Recording indicator */}
      {state === 'recording' && (
        <div className="absolute -inset-1 rounded-full border-2 border-red-500 animate-ping pointer-events-none" />
      )}
      
      {/* Processing indicator */}
      {state === 'processing' && (
        <div className="absolute -inset-1 rounded-full border-2 border-purple-500 animate-ping pointer-events-none" />
      )}
      
      {/* Help tooltip */}
      {isSupported && !error && (
        <div 
          className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 
                  bg-gray-800 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-50
                  shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>点击开始/停止录音</span>
          </div>
        </div>
      )}
    </div>
  );
}