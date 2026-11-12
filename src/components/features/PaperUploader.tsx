import { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { analyzeApi } from '../../services/api';

export const PaperUploader = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    journal: '',
    year: new Date().getFullYear(),
    doi: '',
    keywords: '',
    content: ''
  });
  const [manualForm, setManualForm] = useState(false);
  const [reviewForm, setReviewForm] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const { addPaper, isProcessingPaper, processingPaper, setProcessingPaper } = useAppStore();
  
  // 同步全局处理状态到本地
  useEffect(() => {
    if (isProcessingPaper) {
      setAnalysisResult({
        title: processingPaper?.title || '正在处理...',
        authors: '分析中...',
        abstract: processingPaper?.status || '正在调用 DeepSeek AI 进行论文分析...',
        processing: true
      });
    }
  }, [isProcessingPaper, processingPaper]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const processFile = async (file) => {
    setUploadedFile(file);
    setAnalysisResult(null);
    
    // 设置全局处理状态
    setProcessingPaper(true, {
      title: file.name.replace(/\.[^/.]+$/, ''),
      status: '正在调用 DeepSeek AI 进行论文分析...'
    });
    
    try {
      // 调用后端API分析论文
      console.log('开始上传文件:', file.name);
      console.log('文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');
      
      const startTime = Date.now();
      const result = await analyzeApi.analyzePaper(file);
      const endTime = Date.now();
      
      console.log('分析完成，耗时:', (endTime - startTime) / 1000, '秒');
      console.log('分析结果:', result);
      
      // 保存分析结果
      setAnalysisResult(result);
      
      // 自动保存论文，无需用户手动填写或审查
      await addPaper(result);
      
      // 重置上传状态
      setUploadedFile(null);
      setProcessingPaper(false);
    } catch (error: unknown) {
      console.error('分析论文失败:', error);
      
      // 获取后端返回的错误消息
      const ax = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
      const serverMsg = ax?.response?.data?.message;
      const status = ax?.response?.status;
      const hint = serverMsg || ax?.message || '请确认后端已启动，且文件未超过大小限制（50MB）。';
      
      console.error('错误详情:', {
        status,
        serverMsg,
        message: ax?.message
      });
      
      // 设置分析结果为错误状态
      setAnalysisResult({
        title: '分析失败',
        authors: '-',
        abstract: hint,
        summary: `## 论文分析失败

### 错误说明
${hint}

### 状态码
${status || '未知'}

### 建议
1. 尝试上传 TXT 格式的论文文件
2. 或手动输入论文信息
3. 确认文件格式支持（PDF、TXT、DOCX、DOC）
4. 检查文件大小不超过 50MB
5. 确认网络连接稳定

### 上传信息
- 文件名: ${file.name}
- 上传时间: ${new Date().toLocaleString()}
- 文件大小: ${(file.size / 1024).toFixed(2)} KB`,
        journal: '-',
        year: new Date().getFullYear(),
        doi: '',
        keywords: [],
        content: `上传的文件: ${file.name}`,
        fileName: file.name,
        filePath: `local-${Date.now()}`,
        processing: false
      });
      
      // 重置上传状态
      setUploadedFile(null);
      setProcessingPaper(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const paperData = {
      title: formData.title,
      authors: formData.authors,
      abstract: formData.abstract,
      journal: formData.journal,
      year: formData.year,
      doi: formData.doi,
      keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
      content: formData.content
    };

    addPaper(paperData);
    
    setFormData({
      title: '',
      authors: '',
      abstract: '',
      journal: '',
      year: new Date().getFullYear(),
      doi: '',
      keywords: '',
      content: ''
    });
    setManualForm(false);
    setReviewForm(false);
    setUploadedFile(null);
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setAnalysisResult(null);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        {isProcessingPaper ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-6 p-8"
          >
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-xl font-medium text-slate-700">正在解析论文...</p>
            <p className="text-sm text-slate-500 max-w-md text-center">请稍候，系统正在提取文本并调用DeepSeek AI进行分析，这可能需要几秒钟时间</p>
          </motion.div>
        ) : analysisResult ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-6"
          >
            {analysisResult.processing ? (
              <>
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-700">正在分析论文</p>
                  <p className="text-sm text-slate-500">请稍候，DeepSeek AI 正在分析...</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 text-green-500" />
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-700">论文分析完成</p>
                  <p className="text-sm text-slate-500">上传成功！</p>
                </div>
              </>
            )}
            
            {/* 显示分析结果 */}
            <div className="w-full max-w-4xl p-8 bg-white rounded-xl shadow-md border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">{analysisResult.title}</h3>
              <p className="text-slate-600 mb-8 text-center">作者：{analysisResult.authors}</p>
              {analysisResult.filePath && analysisResult.fileName && (
                <div className="mb-8 text-center">
                  <a 
                    href={`/uploads/${analysisResult.filePath}`} 
                    download={analysisResult.fileName}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm px-4 py-2 bg-blue-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    下载论文文件
                  </a>
                </div>
              )}
              <div className="prose max-w-none mx-auto space-y-6">
                {analysisResult.summary ? (
                  <div dangerouslySetInnerHTML={{ __html: String(analysisResult.summary) }} />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">{analysisResult.abstract}</p>
                )}
              </div>
              {Array.isArray(analysisResult.keywords) && analysisResult.keywords.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">关键词</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {!analysisResult.processing && (
              <button
                onClick={resetUpload}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                上传另一篇论文
              </button>
            )}
          </motion.div>
        ) : uploadedFile ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center space-y-4"
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-medium text-slate-700">论文分析完成</p>
              <p className="text-sm text-slate-500">{uploadedFile.name}</p>
            </div>
            <button
              onClick={resetUpload}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              上传另一篇论文
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center space-y-6 p-8"
          >
            <div className="w-24 h-24 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Upload className="w-12 h-12 text-blue-600" />
            </div>
            <div className="space-y-3 text-center">
              <p className="text-xl font-medium text-slate-700">
                拖拽论文文件到这里
              </p>
              <p className="text-sm text-slate-500 max-w-md">
                或点击选择文件 (PDF, TXT, DOCX, DOC)
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                系统将自动提取文本并调用DeepSeek AI进行分析
              </p>
            </div>
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.txt,.docx,.doc"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer font-medium shadow-md"
            >
              选择文件
            </label>
          </motion.div>
        )}
      </div>
    </div>
  );
};
