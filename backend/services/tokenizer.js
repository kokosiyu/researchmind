export const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
  '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
  '么', '什么', '为', '所', '以', '及', '与', '或', '但', '而', '把',
  '被', '让', '从', '对', '已', '于', '由', '这个', '那个', '这些',
  '那些', '可以', '可', '将', '并', '其', '中', '之',
  '该', '能', '来', '更', '还', '只',
  '做', '因', '因为', '所以', '如果', '虽然', '但是', '然而', '因此',
  '如', '如下', '所示', '参', '参考文献',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'of', 'in', 'to', 'for',
  'with', 'on', 'at', 'from', 'by', 'and', 'or', 'not', 'this', 'that',
  'these', 'those', 'it', 'its', 'as', 'which', 'who', 'whom', 'where',
  'when', 'how', 'what', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just',
  'about', 'above', 'after', 'again', 'also', 'any', 'because', 'before',
  'between', 'during', 'into', 'through', 'up', 'down', 'out', 'over',
  'under', 'further', 'then', 'once', 'here', 'there', 'no', 'nor',
  'only', 'own', 'same', 'so', 'if', 'while', 'we', 'our', 'you', 'your',
  'they', 'their', 'them', 'he', 'she', 'his', 'her'
]);

function isChinese(char) {
  const code = char.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fa5;
}

function isEnglish(char) {
  return /[a-zA-Z]/.test(char);
}

function isDigit(char) {
  return /[0-9]/.test(char);
}

export function tokenize(text) {
  if (!text || typeof text !== 'string') return [];

  const normalized = text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const tokens = [];
  let i = 0;

  while (i < normalized.length) {
    const char = normalized[i];

    if (isChinese(char)) {
      tokens.push(char);
      if (i + 1 < normalized.length && isChinese(normalized[i + 1])) {
        tokens.push(char + normalized[i + 1]);
      }
      if (i + 2 < normalized.length && isChinese(normalized[i + 2])) {
        tokens.push(normalized[i + 1] + normalized[i + 2]);
      }
      i++;
    } else if (isEnglish(char) || isDigit(char)) {
      let word = '';
      while (i < normalized.length && (isEnglish(normalized[i]) || isDigit(normalized[i]) || normalized[i] === '-' || normalized[i] === '_')) {
        word += normalized[i];
        i++;
      }
      if (word.length >= 2) {
        tokens.push(word);
      }
    } else {
      i++;
    }
  }

  return tokens;
}

export function removeStopWords(tokens) {
  return tokens.filter(token => !STOP_WORDS.has(token));
}

export function processText(text) {
  const tokens = tokenize(text);
  return removeStopWords(tokens);
}
