import { validatePlayerNames } from '../validatePlayerNames';

describe('validatePlayerNames', () => {
  describe('有効な名前の通過テスト', () => {
    it('有効な名前の配列をそのまま返す', () => {
      // Arrange
      const names = ['Alice', 'Bob', 'Charlie'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('1文字の名前を許可する', () => {
      // Arrange
      const names = ['A'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['A']);
    });

    it('50文字の名前を許可する', () => {
      // Arrange
      const names = ['A'.repeat(50)];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['A'.repeat(50)]);
    });
  });

  describe('空文字列の除外テスト', () => {
    it('空文字列を除外する', () => {
      // Arrange
      const names = ['Alice', '', 'Bob'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('空白文字のみの文字列を除外する', () => {
      // Arrange
      const names = ['Alice', '   ', 'Bob'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('全て空文字列の場合は空配列を返す', () => {
      // Arrange
      const names = ['', '  ', ''];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('HTML特殊文字のエスケープテスト', () => {
    it('<script>タグをエスケープする', () => {
      // Arrange
      const names = ['<script>alert("XSS")</script>'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;']);
    });

    it('&をエスケープする', () => {
      // Arrange
      const names = ['Alice & Bob'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice &amp; Bob']);
    });

    it('"をエスケープする', () => {
      // Arrange
      const names = ['Say "Hello"'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Say &quot;Hello&quot;']);
    });

    it('\'をエスケープする', () => {
      // Arrange
      const names = ["It's Bob"];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['It&#x27;s Bob']);
    });

    it('複数のHTML特殊文字を同時にエスケープする', () => {
      // Arrange
      const names = ['<div>"Test" & \'example\'</div>'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['&lt;div&gt;&quot;Test&quot; &amp; &#x27;example&#x27;&lt;/div&gt;']);
    });
  });

  describe('重複名の除外テスト', () => {
    it('重複する名前を除外する', () => {
      // Arrange
      const names = ['Alice', 'Bob', 'Alice', 'Charlie'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('3回以上重複する名前も1つだけ残す', () => {
      // Arrange
      const names = ['Alice', 'Alice', 'Alice', 'Bob'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('全て同じ名前の場合は1つだけ返す', () => {
      // Arrange
      const names = ['Alice', 'Alice', 'Alice'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice']);
    });

    it('大文字小文字を区別して重複判定する', () => {
      // Arrange
      const names = ['Alice', 'alice', 'ALICE'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice', 'alice', 'ALICE']);
    });
  });

  describe('51文字以上の名前の拒否テスト', () => {
    it('51文字の名前を除外する', () => {
      // Arrange
      const names = ['A'.repeat(51), 'Bob'];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Bob']);
    });

    it('100文字の名前を除外する', () => {
      // Arrange
      const names = ['Alice', 'A'.repeat(100)];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Alice']);
    });

    it('51文字以上の名前が複数ある場合は全て除外する', () => {
      // Arrange
      const names = ['A'.repeat(51), 'Bob', 'C'.repeat(60)];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual(['Bob']);
    });
  });

  describe('複合的なバリデーションテスト', () => {
    it('空文字列、重複、HTML特殊文字、長さ超過を同時に処理する', () => {
      // Arrange
      const names = [
        'Alice',
        '',
        'Bob',
        '<script>XSS</script>',
        'Alice', // 重複
        'A'.repeat(51), // 長さ超過
        '  ', // 空白
        'Charlie & Dave'
      ];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual([
        'Alice',
        'Bob',
        '&lt;script&gt;XSS&lt;/script&gt;',
        'Charlie &amp; Dave'
      ]);
    });

    it('全て無効な名前の場合は空配列を返す', () => {
      // Arrange
      const names = [
        '',
        '  ',
        'A'.repeat(51),
        'B'.repeat(100)
      ];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual([]);
    });

    it('空配列を渡すと空配列を返す', () => {
      // Arrange
      const names: string[] = [];

      // Act
      const result = validatePlayerNames(names);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
