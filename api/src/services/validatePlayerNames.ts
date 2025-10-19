/**
 * HTML特殊文字のエスケープマップ
 */
const HTML_ESCAPE_MAP: { [key: string]: string } = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;'
};

/**
 * HTML特殊文字をエスケープする
 *
 * @param {string} text - エスケープ対象の文字列
 * @returns {string} エスケープ済みの文字列
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * プレイヤー名のバリデーションとサニタイゼーション
 *
 * プレイヤー名配列に対して以下の処理を実施します：
 * 1. 空文字列と空白文字のみの文字列を除外
 * 2. 1-50文字の範囲外の名前を除外
 * 3. HTML特殊文字のエスケープ（XSS対策）
 * 4. 重複名の除外（最初の出現のみ残す）
 *
 * @param {string[]} names - バリデーション対象のプレイヤー名配列
 * @returns {string[]} バリデーション済みのプレイヤー名配列
 *
 * @example
 * validatePlayerNames(['Alice', '', 'Bob', 'Alice', '<script>'])
 * // => ['Alice', 'Bob', '&lt;script&gt;']
 */
export function validatePlayerNames(names: string[]): string[] {
  const seen = new Set<string>();
  const validatedNames: string[] = [];

  for (const name of names) {
    // 1. 空文字列と空白文字のみの文字列を除外
    const trimmedName = name.trim();
    if (trimmedName === '') {
      continue;
    }

    // 2. 1-50文字の範囲外の名前を除外
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      continue;
    }

    // 3. HTML特殊文字のエスケープ（XSS対策）
    const sanitizedName = escapeHtml(trimmedName);

    // 4. 重複名の除外（最初の出現のみ残す）
    if (seen.has(sanitizedName)) {
      continue;
    }

    seen.add(sanitizedName);
    validatedNames.push(sanitizedName);
  }

  return validatedNames;
}
