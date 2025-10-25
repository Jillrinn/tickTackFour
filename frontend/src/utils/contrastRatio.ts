/**
 * WCAG 2.1 コントラスト比計算ユーティリティ
 *
 * WCAG 2.1 AAレベル要件: テキストとその背景のコントラスト比が4.5:1以上
 */

/**
 * RGB色値を相対輝度に変換
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function toLinearValue(channelValue: number): number {
  const normalized = channelValue / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * 相対輝度を計算
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const rLinear = toLinearValue(r);
  const gLinear = toLinearValue(g);
  const bLinear = toLinearValue(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * HEX色コードをRGB値に変換
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * 2つの色のコントラスト比を計算
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * @param foreground 前景色（HEX形式: "#RRGGBB"）
 * @param background 背景色（HEX形式: "#RRGGBB"）
 * @returns コントラスト比（1:1から21:1の範囲）
 */
export function calculateContrastRatio(
  foreground: string,
  background: string
): number {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    throw new Error('Invalid HEX color format');
  }

  const fgLuminance = calculateRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLuminance = calculateRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 2.1 AAレベルのコントラスト比基準を満たすか検証
 *
 * @param foreground 前景色（HEX形式: "#RRGGBB"）
 * @param background 背景色（HEX形式: "#RRGGBB"）
 * @returns 4.5:1以上の場合true
 */
export function meetsWCAG_AA(
  foreground: string,
  background: string
): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  return ratio >= 4.5;
}
