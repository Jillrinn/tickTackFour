/**
 * Azure Functions エントリーポイント
 * すべての関数をインポートして登録
 */

// すべての関数ファイルをインポート（app.http()呼び出しを実行するため）
import './functions/negotiate';
import './functions/getGame';
import './functions/syncTimer';
import './functions/pauseGame';
import './functions/resetGame';
import './functions/updatePlayers';
import './functions/setTimerMode';
