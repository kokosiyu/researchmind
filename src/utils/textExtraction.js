export async function extractTextFromFile(file) {
  try {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.txt')) {
      const text = await file.text();
      return { success: true, text };
    }
    
    if (fileName.endsWith('.pdf')) {
      return { 
        success: true, 
        text: 'PDF解析需要后端支持。请确保后端服务正在运行。'
      };
    }
    
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return { 
        success: true, 
        text: 'Word文档解析需要后端支持。请确保后端服务正在运行。'
      };
    }
    
    const text = await file.text();
    return { success: true, text };
    
  } catch (error) {
    console.error('提取文本失败:', error);
    const errMsg = error instanceof Error ? error.message : '未知错误';
    return { 
      success: false, 
      text: '', 
      error: errMsg 
    };
  }
}

export function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}
