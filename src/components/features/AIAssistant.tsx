import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Sparkles, Loader2, Mic, MicOff, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { assistantApi } from '../../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

const quickQuestions = [
  '帮我总结这篇论文的核心观点',
  '如何提高研究效率？',
  '帮我润色这段文字',
  '推荐一些研究方法',
];

function Eyes({ size = 40, className = '' }: { size?: number; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxMove = size * 0.09;
      const clampDist = Math.min(dist, 200);
      const ratio = clampDist / 200;
      const angle = Math.atan2(dy, dx);
      setPupilOffset({
        x: Math.cos(angle) * maxMove * ratio,
        y: Math.sin(angle) * maxMove * ratio,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size]);

  const w = size;
  const h = size * 0.85;
  const eyeR = size * 0.2;
  const pupilR = size * 0.1;
  const eyeY = h * 0.48;
  const leftEyeX = w * 0.35;
  const rightEyeX = w * 0.65;

  return (
    <svg
      ref={svgRef}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={className}
    >
      <rect
        x={w * 0.08}
        y={h * 0.05}
        width={w * 0.84}
        height={h * 0.9}
        rx={w * 0.22}
        ry={w * 0.22}
        fill="#f0f9ff"
        stroke="#93c5fd"
        strokeWidth={1.5}
      />
      <ellipse
        cx={leftEyeX}
        cy={eyeY}
        rx={eyeR}
        ry={eyeR * 1.15}
        fill="white"
        stroke="#60a5fa"
        strokeWidth={1}
      />
      <circle
        cx={leftEyeX + pupilOffset.x}
        cy={eyeY + pupilOffset.y}
        r={pupilR}
        fill="#1e40af"
      />
      <circle
        cx={leftEyeX + pupilOffset.x - pupilR * 0.3}
        cy={eyeY + pupilOffset.y - pupilR * 0.3}
        r={pupilR * 0.3}
        fill="white"
      />
      <ellipse
        cx={rightEyeX}
        cy={eyeY}
        rx={eyeR}
        ry={eyeR * 1.15}
        fill="white"
        stroke="#60a5fa"
        strokeWidth={1}
      />
      <circle
        cx={rightEyeX + pupilOffset.x}
        cy={eyeY + pupilOffset.y}
        r={pupilR}
        fill="#1e40af"
      />
      <circle
        cx={rightEyeX + pupilOffset.x - pupilR * 0.3}
        cy={eyeY + pupilOffset.y - pupilR * 0.3}
        r={pupilR * 0.3}
        fill="white"
      />
      <ellipse
        cx={w / 2}
        cy={h * 0.72}
        rx={size * 0.06}
        ry={size * 0.035}
        fill="#fda4af"
        opacity={0.6}
      />
    </svg>
  );
}

export const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setInput('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const openCamera = async () => {
    setCameraError('');
    setCapturedImage(null);
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setCameraError('无法访问摄像头，请检查权限设置');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
    setCameraError('');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const maxW = 800;
    const maxH = 600;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxW || h > maxH) {
      const ratio = Math.min(maxW / w, maxH / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')?.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedImage(dataUrl);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  const sendImage = (imageData: string, text?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || '请分析这张图片',
      image: imageData,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    const context = messages.map(m => ({
      role: m.role,
      content: m.content,
      image: m.image ? '[图片]' : undefined,
    }));

    handleStreamResponse(text || '请分析这张图片', context, assistantMessage.id, '[图片]');
  };

  const handleStreamResponse = async (text: string, context: { role: string; content: string; image?: string }[], assistantId: string, image?: string) => {
    try {
      const response = await assistantApi.sendMessage(text, context, image);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) throw new Error(parsed.error);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev =>
                    prev.map(m => m.id === assistantId ? { ...m, content: fullContent } : m)
                  );
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) throw e;
              }
            }
          }
        }
      }

      if (!fullContent) {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: '抱歉，我没有收到有效回复，请稍后重试。' } : m)
        );
      }
    } catch (error: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: `请求失败：${error.message || '请稍后重试'}` } : m)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      image: capturedImage || undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setCapturedImage(null);
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, assistantMessage]);

    const context = messages.map(m => ({
      role: m.role,
      content: m.content,
      image: m.image ? '[图片]' : undefined,
    }));
    handleStreamResponse(messageText, context, assistantMessage.id, userMessage.image ? '[图片]' : undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="font-bold text-sm mt-2 mb-1">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="font-bold text-base mt-2 mb-1">{line.slice(3)}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\.\s/)) {
        return <li key={i} className="ml-4 list-decimal text-sm">{line.replace(/^\d+\.\s/, '')}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold text-sm">{line.slice(2, -2)}</p>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-blue-500/40 transition-shadow overflow-hidden"
          >
            <Eyes size={44} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[9999] w-[380px] h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center overflow-hidden">
                  <Eyes size={36} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">智研小助手</h3>
                  <p className="text-xs text-white/80">学术研究 AI 伙伴</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isRecording && recognitionRef.current) {
                    recognitionRef.current.stop();
                    setIsRecording(false);
                  }
                  setIsOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mb-3 overflow-hidden">
                      <Eyes size={70} />
                    </div>
                    <h4 className="font-bold text-slate-700 text-base">你好！我是智研小助手</h4>
                    <p className="text-sm text-slate-500 mt-1">
                      可以帮你解答问题、辅助写作、整理笔记
                    </p>
                  </div>
                  <div className="space-y-2">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(q)}
                        className="w-full text-left px-3 py-2.5 bg-white rounded-xl text-sm text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gradient-to-br from-blue-100 to-cyan-100'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Eyes size={26} />
                      )}
                    </div>
                    <div
                      className={`px-3 py-2.5 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-tr-md'
                          : 'bg-white text-slate-700 rounded-tl-md border border-slate-200 shadow-sm'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <div>
                          {msg.image && (
                            <img src={msg.image} alt="拍摄的图片" className="rounded-lg mb-2 max-w-full max-h-40 object-cover" />
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : (
                        <div className="text-slate-700">
                          {msg.content ? (
                            renderContent(msg.content)
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                              <span className="text-sm text-slate-400">思考中...</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-slate-200">
              {capturedImage && (
                <div className="relative mb-2 inline-block">
                  <img src={capturedImage} alt="待发送" className="h-16 rounded-lg border border-slate-200" />
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-end space-x-2">
                <button
                  onClick={openCamera}
                  className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors flex-shrink-0"
                  title="拍照分析"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? '正在聆听...' : '输入你的问题...'}
                  rows={1}
                  className={`flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 max-h-24 bg-slate-50 ${
                    isRecording ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
                  }`}
                  style={{ minHeight: '40px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                  }}
                />
                {speechSupported && (
                  <button
                    onClick={toggleRecording}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                    title={isRecording ? '停止录音' : '语音输入'}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !capturedImage) || isLoading}
                  className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-center text-xs text-slate-400 mt-2">
                内容由 AI 生成，仅供参考
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  <span className="font-bold text-sm">拍照分析</span>
                </div>
                <button onClick={closeCamera} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative bg-black">
                {cameraError ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                    <Camera className="w-12 h-12 text-gray-400 mb-3" />
                    <p className="text-red-500 text-sm">{cameraError}</p>
                  </div>
                ) : capturedImage ? (
                  <div className="relative">
                    <img src={capturedImage} alt="拍照结果" className="w-full max-h-[400px] object-contain" />
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[400px] object-contain"
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="p-4 flex items-center gap-3">
                {capturedImage ? (
                  <>
                    <button
                      onClick={() => { setCapturedImage(null); openCamera(); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                      重新拍照
                    </button>
                    <button
                      onClick={() => { sendImage(capturedImage, input.trim() || undefined); closeCamera(); }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      发送分析
                    </button>
                  </>
                ) : (
                  <button
                    onClick={capturePhoto}
                    disabled={!!cameraError}
                    className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    拍照
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
