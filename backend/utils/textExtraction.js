import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import WordExtractor from 'word-extractor';

function fixDoubleEncoding(text) {
  if (!text || text.length < 5) return text;
  try {
    const encoded = iconv.encode(text, 'gbk');
    const decoded = iconv.decode(encoded, 'utf8');
    const chineseCount = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length;
    const originalChineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const hasReplacement = decoded.includes('\ufffd');
    if (chineseCount > originalChineseCount && !hasReplacement) {
      console.log('检测到双重编码，已自动修复');
      return decoded;
    }
  } catch {}
  try {
    const encoded = iconv.encode(text, 'latin1');
    const decoded = encoded.toString('utf8');
    const chineseCount = (decoded.match(/[\u4e00-\u9fa5]/g) || []).length;
    const originalChineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const hasReplacement = decoded.includes('\ufffd');
    if (chineseCount > originalChineseCount * 2 && !hasReplacement) {
      console.log('检测到 latin1 双重编码，已自动修复');
      return decoded;
    }
  } catch {}
  return text;
}

function isValidChineseText(text) {
  if (!text) return true;
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const garbled = (text.match(/[\uE000-\uF8FF]/g) || []).length;
  if (chinese > 0 && garbled > chinese * 0.3) return false;
  return true;
}

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
          const pdfData = await pdfParse(buffer, {
            max: 0,
            version: 'v2.0.550'
          });
          text = pdfData.text || '';
          console.log('PDF 解析成功，文本长度:', text.length, '页数:', pdfData.numpages || '未知');
          if (!text.trim()) {
            console.warn('PDF 文本为空，可能是扫描件或加密PDF');
            text = `PDF文件: ${originalName}（文本为空，可能是扫描件）`;
          }
        } catch (pdfErr) {
          console.error('PDF 解析失败:', pdfErr.message);
          try {
            const altData = await pdfParse(buffer);
            text = altData.text || '';
            console.log('PDF 第二次解析成功，文本长度:', text.length);
          } catch (altErr) {
            console.error('PDF 第二次解析也失败:', altErr.message);
            text = `PDF文件: ${originalName}`;
          }
        }
        break;
      }
      case '.docx': {
        console.log('解析 DOCX 文件:', originalName);
        try {
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || '';
          if (result.messages && result.messages.length > 0) {
            console.warn('DOCX 解析警告:', result.messages.map(m => m.message).join('; '));
          }
          console.log('DOCX 解析成功，文本长度:', text.length);
        } catch (docxErr) {
          console.error('DOCX 解析失败:', docxErr.message);
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
          console.error('DOC 解析失败:', docErr.message);
          try {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value || '';
            console.log('DOC 使用 mammoth 回退解析成功，文本长度:', text.length);
          } catch (fallbackErr) {
            console.error('DOC 回退解析也失败:', fallbackErr.message);
            text = `DOC文件: ${originalName}`;
          }
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
          const invalidRatio = (text.match(/\ufffd/g) || []).length / Math.max(text.length, 1);
          if (invalidRatio > 0.1) {
            console.warn('解码后无效字符比例过高，尝试 UTF-8');
            text = iconv.decode(buffer, 'utf8');
          }
          console.log('文本解析成功，长度:', text.length);
        } catch (textErr) {
          console.error('文本文件解析失败:', textErr.message);
          try {
            text = buffer.toString('utf8');
          } catch {
            text = `文本文件: ${originalName}`;
          }
        }
        break;
      }
      default: {
        console.warn('不支持的文件格式:', fileExt);
        text = `文件: ${originalName}`;
        break;
      }
    }

    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    if (!text) {
      return {
        success: false,
        text: '',
        message: '文档内容为空或无法有效提取'
      };
    }

    if (!isValidChineseText(text)) {
      console.log('检测到可能的编码错误，尝试修复...');
      const fixed = fixDoubleEncoding(text);
      if (isValidChineseText(fixed) && fixed !== text) {
        console.log('编码修复成功');
        text = fixed;
      }
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
