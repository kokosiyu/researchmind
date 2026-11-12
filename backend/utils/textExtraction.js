import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import WordExtractor from 'word-extractor';

// 判断文本编码：BOM + 替换字符比例 + 简繁启发式
export function detectEncoding(buffer) {
  const BOM_UTF8 = buffer.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  const BOM_UTF16LE = buffer.slice(0, 2).equals(Buffer.from([0xff, 0xfe]));
  const BOM_UTF16BE = buffer.slice(0, 2).equals(Buffer.from([0xfe, 0xff]));

  if (BOM_UTF8) return 'utf8';
  if (BOM_UTF16LE) return 'utf16-le';
  if (BOM_UTF16BE) return 'utf16-be';

  // 首先尝试用 UTF-8 解码，统计替换字符数量
  let utf8Text = '';
  try {
    utf8Text = iconv.decode(buffer, 'utf8');
  } catch {
    utf8Text = '';
  }
  const utf8InvalidCount = (utf8Text.match(/\ufffd/g) || []).length;
  const utf8InvalidRatio = utf8Text.length > 0 ? utf8InvalidCount / utf8Text.length : 1;

  // 再尝试用 GBK 解码
  let gbkText = '';
  try {
    gbkText = iconv.decode(buffer, 'gbk');
  } catch {
    gbkText = '';
  }
  const gbkInvalidCount = (gbkText.match(/\ufffd/g) || []).length;
  const gbkInvalidRatio = gbkText.length > 0 ? gbkInvalidCount / gbkText.length : 1;

  // 检查是否有中文（简化判断）
  const hasChineseUtf8 = /[\u4e00-\u9fa5]/.test(utf8Text);
  const hasChineseGbk = /[\u4e00-\u9fa5]/.test(gbkText);

  console.log(`编码检测: UTF8无效=${utf8InvalidCount}(${utf8InvalidRatio.toFixed(2)}), GBK无效=${gbkInvalidCount}(${gbkInvalidRatio.toFixed(2)})`);

  // 优先选择无效字符少的编码
  // 如果 UTF-8 有超过 5% 的无效字符，且 GBK 有中文，优先选择 GBK
  if (utf8InvalidRatio > 0.05 && gbkInvalidRatio < 0.1 && hasChineseGbk) {
    console.log('GBK编码更合适');
    return 'gbk';
  }
  if (utf8InvalidCount === 0 && hasChineseUtf8) return 'utf8';
  if (gbkInvalidCount === 0 && hasChineseGbk) return 'gbk';
  if (utf8InvalidCount < gbkInvalidCount) return 'utf8';
  if (gbkInvalidCount < utf8InvalidCount) return 'gbk';

  // 默认返回 UTF-8
  return 'utf8';
}

export async function extractTextFromFile(filePath, originalName) {
  const fileExt = path.extname(originalName).toLowerCase().trim();
  const buffer = fs.readFileSync(filePath);

  let text = '';

  try {
    switch (fileExt) {
      case '.pdf': {
        console.log('解析 PDF 文件:', originalName);
        try {
          const pdfData = await pdfParse(buffer);
          text = pdfData.text || '';
          console.log('PDF 解析成功，文本长度:', text.length);
          if (!text.trim()) {
            console.warn('PDF 文本为空，尝试其他方式');
            text = `PDF文件: ${originalName}`;
          }
        } catch (pdfErr) {
          console.error('PDF 解析失败:', pdfErr);
          text = `PDF文件: ${originalName}`;
        }
        break;
      }
      case '.docx': {
        console.log('解析 DOCX 文件:', originalName);
        try {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || '';
          console.log('DOCX 解析成功，文本长度:', text.length);
        } catch (docxErr) {
          console.error('DOCX 解析失败:', docxErr);
          text = `DOCX文件: ${originalName}`;
        }
        break;
      }
      case '.doc': {
        console.log('解析 DOC 文件:', originalName);
        try {
          const extractor = new WordExtractor();
          const docData = await extractor.extract(filePath);
          text = docData.getBody() || '';
          console.log('DOC 解析成功，文本长度:', text.length);
        } catch (docErr) {
          console.error('DOC 解析失败:', docErr);
          text = `DOC文件: ${originalName}`;
        }
        break;
      }
      case '.txt':
      case '.md':
      case '.markdown':
      case '.mdown':
      case '.mkd': {
        console.log('解析文本文件:', originalName);
        try {
          const encoding = detectEncoding(buffer);
          console.log('检测到的编码:', encoding);
          text = iconv.decode(buffer, encoding);
          console.log('文本解析成功，长度:', text.length);
        } catch (textErr) {
          console.error('文本文件解析失败:', textErr);
          text = `文本文件: ${originalName}`;
        }
        break;
      }
      default: {
        console.warn('不支持的文件格式:', fileExt);
        text = `文件: ${originalName}`;
        break;
      }
    }

    // 清理文本（移除多余空白）
    text = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

    if (!text) {
      return {
        success: false,
        text: '',
        message: '文档内容为空或无法有效提取'
      };
    }

    return {
      success: true,
      text: text
    };
  } catch (err) {
    console.error('文档解析失败:', err);
    return {
      success: false,
      text: '',
      message: `文档解析失败: ${err.message}`
    };
  }
}
