import { Injectable } from '@angular/core';

export type FontSize = 'small' | 'medium' | 'large';

/**
 * アクセントカラー(赤/青/緑/紫/黄)。
 * これは「デザインテーマ」(背景・カード・装飾・タイポグラフィなど、世界観そのもの)とは
 * 別の設定として扱う。デザインテーマはプレイ中のゲーム(ポケモン/NARUTO)に応じて
 * `RealmService`が自動的に切り替え、その中で使うアクセントカラーだけをここで選ぶ。
 * 同じ「青」でもポケモン世界とNARUTO世界では実際の色味が異なる(styles.scss側で
 * `body.realm-pokemon.color-blue` / `body.realm-naruto.color-blue` として個別に定義)。
 */
export type AccentColor = 'red' | 'blue' | 'green' | 'purple' | 'yellow';

const HINT_LIMIT_KEY_PREFIX = 'pokequiz.hintLimit.';
const FONT_SIZE_KEY = 'pokequiz.fontSize';
const COLOR_KEY = 'pokequiz.color';
const HIGH_CONTRAST_KEY = 'pokequiz.highContrast';
const SOUND_ENABLED_KEY = 'pokequiz.soundEnabled';
const DEFAULT_HINT_LIMIT = 5;
const COLOR_CLASSES = ['color-red', 'color-blue', 'color-green', 'color-purple', 'color-yellow'];
const HIGH_CONTRAST_VARS: Record<string, string> = {
  '--accent': '#ffd600',
  '--accent-soft': '#333333',
  '--bg-start': '#121212',
  '--bg-end': '#000000',
  '--surface': 'rgba(20, 20, 20, 0.96)',
  '--surface-strong': '#161616',
  '--surface-border': '#ffd600',
  '--text-main': '#ffffff',
  '--text-sub': '#e0e0e0',
};

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {

  init(): void {
    this.applyFontSize(this.getFontSize());
    this.applyColor(this.getColor());
    this.applyHighContrast(this.getHighContrast());
  }

  getHintLimit(difficulty: string): number {
    const raw = localStorage.getItem(HINT_LIMIT_KEY_PREFIX + difficulty);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_HINT_LIMIT;
  }

  setHintLimit(difficulty: string, value: number): void {
    localStorage.setItem(HINT_LIMIT_KEY_PREFIX + difficulty, String(value));
  }

  getFontSize(): FontSize {
    return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || 'medium';
  }

  setFontSize(size: FontSize): void {
    localStorage.setItem(FONT_SIZE_KEY, size);
    this.applyFontSize(size);
  }

  getColor(): AccentColor {
    const raw = localStorage.getItem(COLOR_KEY);
    if (raw === 'red' || raw === 'blue' || raw === 'green' || raw === 'purple' || raw === 'yellow') {
      return raw;
    }
    // 旧バージョン(配色テーマ)からの移行:'default'やハイコントラストは赤扱いにする
    return 'red';
  }

  setColor(color: AccentColor): void {
    localStorage.setItem(COLOR_KEY, color);
    this.applyColor(color);
  }

  getHighContrast(): boolean {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
  }

  setHighContrast(enabled: boolean): void {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
    this.applyHighContrast(enabled);
  }

  getSoundEnabled(): boolean {
    return localStorage.getItem(SOUND_ENABLED_KEY) !== 'false';
  }

  setSoundEnabled(enabled: boolean): void {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  }

  private applyFontSize(size: FontSize): void {
    document.documentElement.classList.remove('font-small', 'font-medium', 'font-large');
    document.documentElement.classList.add(`font-${size}`);
  }

  private applyColor(color: AccentColor): void {
    document.body.classList.remove(...COLOR_CLASSES);
    document.body.classList.add(`color-${color}`);
  }

  /**
   * ハイコントラストは「配色テーマ」の1つではなく、独立したアクセシビリティ機能として扱う。
   * CSS変数の優先度(詳細度)の問題を避けるため、bodyのインラインstyleに直接書き込むことで
   * テーマ/カラーのどの組み合わせよりも確実に上書きする。
   */
  private applyHighContrast(enabled: boolean): void {
    document.body.classList.toggle('a11y-high-contrast', enabled);
    Object.keys(HIGH_CONTRAST_VARS).forEach(key => {
      if (enabled) {
        document.body.style.setProperty(key, HIGH_CONTRAST_VARS[key]);
      } else {
        document.body.style.removeProperty(key);
      }
    });
  }
}
