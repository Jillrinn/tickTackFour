/**
 * Azure Functions エントリーポイント
 * 全ての関数をインポートして登録する
 */

// 各関数ファイルをインポート（app.http()による登録を実行するため）
import './functions/getGame';
import './functions/health';
import './functions/pause';
import './functions/reset';
import './functions/resume';
import './functions/switchTurn';
import './functions/updateGame';
