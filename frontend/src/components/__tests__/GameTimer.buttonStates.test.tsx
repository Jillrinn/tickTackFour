import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameTimer } from '../GameTimer';

describe('GameTimer - ボタン状態管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 5.1: ゲーム未開始時のボタン状態', () => {
    it('一時停止ボタンがdisabled状態で表示される', () => {
      render(<GameTimer />);

      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      expect(pauseButton).toBeDisabled();
    });

    it('次のプレイヤーへボタンのテキストが「ゲームを開始する」である', () => {
      render(<GameTimer />);

      const nextPlayerButton = screen.getByRole('button', { name: /ゲームを開始/ });
      expect(nextPlayerButton).toHaveTextContent('ゲームを開始する');
    });

    it('次のプレイヤーへボタンのaria-labelが「ゲームを開始」である', () => {
      render(<GameTimer />);

      const nextPlayerButton = screen.getByRole('button', { name: 'ゲームを開始' });
      expect(nextPlayerButton).toBeInTheDocument();
    });
  });

  describe('Task 5.2: ゲーム進行中のボタン状態', () => {
    it('ゲーム開始後、一時停止ボタンがenabled状態になる', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // 一時停止ボタンが有効化されていることを確認
      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      expect(pauseButton).not.toBeDisabled();
    });

    it('ゲーム開始後、次のプレイヤーへボタンのテキストが「次のプレイヤーへ →」に変化する', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // ボタンテキストが変化したことを確認
      const nextPlayerButton = screen.getByRole('button', { name: /次のプレイヤーに切り替え/ });
      expect(nextPlayerButton).toHaveTextContent('次のプレイヤーへ →');
    });

    it('ゲーム開始後、次のプレイヤーへボタンのaria-labelが「次のプレイヤーに切り替え」である', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // aria-labelを確認
      const nextPlayerButton = screen.getByRole('button', { name: '次のプレイヤーに切り替え' });
      expect(nextPlayerButton).toBeInTheDocument();
    });
  });

  describe('Task 5.3: ボタンクリック動作', () => {
    it('「ゲームを開始する」ボタンクリック後、activePlayerIndexが0に設定される', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム未開始状態を確認
      expect(screen.getByText('ゲーム未開始')).toBeInTheDocument();

      // ゲーム開始ボタンをクリック
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // アクティブプレイヤーが表示されることを確認（activePlayerIndex = 0）
      expect(screen.getByText(/現在のプレイヤー/)).toBeInTheDocument();
      expect(screen.queryByText('ゲーム未開始')).not.toBeInTheDocument();
    });

    it('リセットボタンクリック後、ボタンテキストが「ゲームを開始する」に戻る', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // ボタンテキストが変化したことを確認
      expect(screen.getByText('次のプレイヤーへ →')).toBeInTheDocument();

      // リセットボタンをクリック
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // ボタンテキストが元に戻ることを確認
      expect(screen.getByText('ゲームを開始する')).toBeInTheDocument();
    });

    it('リセットボタンクリック後、一時停止ボタンがdisabled状態に戻る', async () => {
      const user = userEvent.setup();
      render(<GameTimer />);

      // ゲーム開始
      const startButton = screen.getByRole('button', { name: /ゲームを開始/ });
      await user.click(startButton);

      // 一時停止ボタンが有効化されていることを確認
      const pauseButton = screen.getByRole('button', { name: /ゲームを一時停止/ });
      expect(pauseButton).not.toBeDisabled();

      // リセットボタンをクリック
      const resetButton = screen.getByRole('button', { name: /リセット/ });
      await user.click(resetButton);

      // 一時停止ボタンがdisabledに戻ることを確認
      expect(pauseButton).toBeDisabled();
    });
  });
});
