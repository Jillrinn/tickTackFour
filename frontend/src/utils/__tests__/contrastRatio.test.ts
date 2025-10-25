import { describe, it, expect } from 'vitest';
import {
  calculateContrastRatio,
  meetsWCAG_AA,
} from '../contrastRatio';

describe('contrastRatio', () => {
  describe('calculateContrastRatio', () => {
    it('白と黒のコントラスト比は21:1に近い', () => {
      const ratio = calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('同じ色のコントラスト比は1:1', () => {
      const ratio = calculateContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('前景色と背景色の順序に関わらず同じ比率を返す', () => {
      const ratio1 = calculateContrastRatio('#1976d2', '#ffffff');
      const ratio2 = calculateContrastRatio('#ffffff', '#1976d2');
      expect(ratio1).toBeCloseTo(ratio2, 5);
    });
  });

  describe('meetsWCAG_AA', () => {
    it('4.5:1以上のコントラスト比でtrueを返す', () => {
      // 白背景に黒テキスト（21:1）
      expect(meetsWCAG_AA('#000000', '#ffffff')).toBe(true);
    });

    it('4.5:1未満のコントラスト比でfalseを返す', () => {
      // 薄いグレー背景に白テキスト（コントラスト不足）
      expect(meetsWCAG_AA('#ffffff', '#e0e0e0')).toBe(false);
    });
  });

  describe('Task 5.2: プレイヤーカードのコントラスト比検証', () => {
    describe('アクティブプレイヤーカード（青背景 + 白テキスト）', () => {
      const background = '#1976d2'; // アクティブカード背景色
      const foreground = '#ffffff'; // 白テキスト

      it('プレイヤー名のコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });

      it('タイマー表示のコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });
    });

    describe('非アクティブプレイヤーカード（白背景 + 濃いグレーテキスト）', () => {
      const background = '#ffffff'; // 非アクティブカード背景色
      const foreground = '#212121'; // 濃いグレーテキスト

      it('プレイヤー名のコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });

      it('タイマー表示のコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });

      it('実際のコントラスト比が12.63:1以上（高コントラスト）', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(12.63);
      });
    });

    describe('カード境界の視認性', () => {
      const background = '#ffffff'; // カード背景
      const border = '#616161'; // カードボーダー色

      it('カードボーダーのコントラスト比が十分（3:1以上）', () => {
        const ratio = calculateContrastRatio(border, background);
        // UI要素（非テキスト）のWCAG基準は3:1以上
        expect(ratio).toBeGreaterThanOrEqual(3.0);
      });
    });
  });

  describe('Task 5.3: ゲームタイマーUIのコントラスト比検証', () => {
    describe('固定ヘッダーのプレイヤー名', () => {
      const background = 'rgba(255, 255, 255, 0.98)'; // 実質的に白背景
      const foreground = '#0d47a1'; // 濃い青

      it('プレイヤー名のコントラスト比が4.5:1以上', () => {
        // rgba背景はほぼ白として扱う
        const ratio = calculateContrastRatio(foreground, '#ffffff');
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, '#ffffff')).toBe(true);
      });
    });

    describe('タイマー数値表示', () => {
      const foreground = '#1b5e20'; // 濃い緑
      const background = '#ffffff'; // 白背景（背景色の透明度は無視）

      it('タイマー数値のコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });
    });

    describe('次のプレイヤーへボタン', () => {
      const background = '#1b5e20'; // 濃い緑背景
      const foreground = '#ffffff'; // 白テキスト

      it('ボタンテキストのコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });
    });

    describe('一時停止ボタン', () => {
      const background = '#e65100'; // 濃いオレンジ背景
      const foreground = '#ffffff'; // 白テキスト

      it('ボタンテキストのコントラスト比が4.5:1以上', () => {
        const ratio = calculateContrastRatio(foreground, background);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
        expect(meetsWCAG_AA(foreground, background)).toBe(true);
      });
    });
  });
});
