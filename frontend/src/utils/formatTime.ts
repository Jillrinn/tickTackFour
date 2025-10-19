/**
 * 秒数を時間文字列に変換
 * @param seconds - 秒数（0以上の整数）
 * @returns MM:SS形式（1時間以上の場合はHH:MM:SS形式）
 */
export function formatTime(seconds: number): string {
  // 負の値を0として扱う
  const totalSeconds = Math.max(0, seconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
