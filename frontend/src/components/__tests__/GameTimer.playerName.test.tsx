import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, test, expect } from 'vitest';
import { GameTimer } from '../GameTimer';

describe('GameTimer - プレイヤー名入力UI', () => {
  test('各プレイヤーカードに名前入力フィールドが表示される', () => {
    render(<GameTimer />);

    // プレイヤー名入力フィールドを取得
    const nameInputs = screen.getAllByRole('textbox', { name: /プレイヤー名/i });

    // デフォルトで4人のプレイヤーが表示される
    expect(nameInputs).toHaveLength(4);

    // 各入力フィールドにデフォルト名が表示される
    nameInputs.forEach((input, index) => {
      expect(input).toHaveValue(`プレイヤー${index + 1}`);
    });
  });

  test('プレイヤー名入力フィールドをクリックするとテキスト入力が可能', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const firstPlayerCard = screen.getAllByRole('listitem')[0];
    const input = within(firstPlayerCard).getByRole('textbox', { name: /プレイヤー名/i });

    // クリックしてフォーカス
    await user.click(input);

    // フォーカスされていることを確認
    expect(input).toHaveFocus();
  });

  test('入力内容を即座にプレイヤー表示領域に反映する', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const firstPlayerCard = screen.getAllByRole('listitem')[0];
    const input = within(firstPlayerCard).getByRole('textbox', { name: /プレイヤー名/i });

    // 名前を変更
    await user.clear(input);
    await user.type(input, 'アリス');

    // 即座に反映されていることを確認
    expect(input).toHaveValue('アリス');
  });

  test('プレイヤー名が未設定の場合はデフォルト名を表示', () => {
    render(<GameTimer />);

    const playerCards = screen.getAllByRole('listitem');

    // デフォルト名が表示されていることを確認
    expect(within(playerCards[0]).getByRole('textbox')).toHaveValue('プレイヤー1');
    expect(within(playerCards[1]).getByRole('textbox')).toHaveValue('プレイヤー2');
    expect(within(playerCards[2]).getByRole('textbox')).toHaveValue('プレイヤー3');
    expect(within(playerCards[3]).getByRole('textbox')).toHaveValue('プレイヤー4');
  });

  test('複数のプレイヤー名を個別に変更できる', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    const playerCards = screen.getAllByRole('listitem');

    // 1人目の名前を変更
    const input1 = within(playerCards[0]).getByRole('textbox', { name: /プレイヤー名/i });
    await user.clear(input1);
    await user.type(input1, 'アリス');

    // 2人目の名前を変更
    const input2 = within(playerCards[1]).getByRole('textbox', { name: /プレイヤー名/i });
    await user.clear(input2);
    await user.type(input2, 'ボブ');

    // それぞれ正しく反映されていることを確認
    expect(input1).toHaveValue('アリス');
    expect(input2).toHaveValue('ボブ');
    expect(within(playerCards[2]).getByRole('textbox')).toHaveValue('プレイヤー3');
  });

  test('プレイヤー数を変更しても名前が保持される', async () => {
    const user = userEvent.setup();
    render(<GameTimer />);

    // 1人目の名前を変更
    const nameInputs = screen.getAllByRole('textbox', { name: /プレイヤー名/i });
    await user.clear(nameInputs[0]);
    await user.type(nameInputs[0], 'アリス');

    // プレイヤー数を5人に変更（Phase 3でドロップダウンに変更）
    const dropdown = screen.getByTestId('player-count-dropdown') as HTMLSelectElement;
    await user.selectOptions(dropdown, '5');

    // 1人目の名前が保持されていることを確認
    const updatedInputs = screen.getAllByRole('textbox', { name: /プレイヤー名/i });
    expect(updatedInputs).toHaveLength(5);
    expect(updatedInputs[0]).toHaveValue('アリス');

    // 5人目はデフォルト名
    expect(updatedInputs[4]).toHaveValue('プレイヤー5');
  });

  test('入力フィールドに適切なスタイリングが適用される', () => {
    render(<GameTimer />);

    const input = within(screen.getAllByRole('listitem')[0]).getByRole('textbox', { name: /プレイヤー名/i });

    // クラス名が適用されていることを確認
    expect(input).toHaveClass('player-name-input');
  });
});
