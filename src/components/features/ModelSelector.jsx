import { useState } from 'react';
import { Cloud, Cpu, ChevronDown, Download, CheckCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { localLLM, AVAILABLE_MODELS } from '../../services/localLLM';

export const ModelSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    aiMode, 
    setAIMode, 
    selectedModel, 
    setSelectedModel,
    isModelLoaded,
    modelLoadingProgress,
    modelLoadingText,
    setModelLoaded,
    setModelLoadingProgress
  } = useAppStore();

  const handleLoadModel = async (model) => {
    try {
      setModelLoadingProgress(0, '准备加载模型...');
      
      await localLLM.loadModel(model.name, (progress) => {
        setModelLoadingProgress(progress.progress, progress.text);
      });
      
      setModelLoaded(true);
      setSelectedModel(model.name);
    } catch (error) {
      console.error('加载模型失败:', error);
      setModelLoadingProgress(0, '加载失败');
    }
  };

  const currentModelInfo = AVAILABLE_MODELS.find(m => m.name === selectedModel);

  return (
    <div className="w-full max-w-md mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-700">AI 模式</span>
        <div className="flex items-center space-x-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setAIMode('cloud')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              aiMode === 'cloud' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>云端</span>
          </button>
          <button
            onClick={() => setAIMode('local')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              aiMode === 'local' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>本地</span>
          </button>
        </div>
      </div>

      {aiMode === 'local' && (
        <div className="bg-slate-50 rounded-xl p-4">
          {modelLoadingProgress > 0 && modelLoadingProgress < 1 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">{modelLoadingText}</span>
                <span className="text-sm font-medium text-blue-600">
                  {(modelLoadingProgress * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${modelLoadingProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">选择模型</span>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <span>{currentModelInfo?.displayName || '选择模型'}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {isOpen && (
              <div className="space-y-2">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => {
                      handleLoadModel(model);
                      setIsOpen(false);
                    }}
                    disabled={modelLoadingProgress > 0 && modelLoadingProgress < 1}
                    className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedModel === model.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                    } ${modelLoadingProgress > 0 && modelLoadingProgress < 1 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-slate-900">
                            {model.displayName}
                          </span>
                          {model.recommended && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {model.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-slate-500">{model.size}</span>
                        {selectedModel === model.name && isModelLoaded ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Download className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {isModelLoaded && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{currentModelInfo?.displayName} 已就绪</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
