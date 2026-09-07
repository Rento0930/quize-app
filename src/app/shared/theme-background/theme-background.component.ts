import { Component } from '@angular/core';
import { RealmService } from '../realm.service';

interface Particle {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

function buildParticles(count: number, sizeRange: [number, number], durationRange: [number, number]): Particle[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
    delay: Math.random() * durationRange[1],
    duration: durationRange[0] + Math.random() * (durationRange[1] - durationRange[0]),
  }));
}

/**
 * アプリ全体の背後に敷く、テーマ(世界観)ごとの装飾レイヤー。
 * `pages.component.html` に一度だけ配置し、RealmServiceの状態に応じて
 * ポケモン世界／NARUTO世界のレイヤー一式をフェード切り替えする。
 *
 * 新しいテーマを追加する場合は、テンプレートに `.xxbg` ブロックを追加し、
 * このコンポーネントのSCSSに同様の構成(base/glow/装飾/パターン/粒子)で
 * スタイルを追加すればよい。
 */
@Component({
  selector: 'app-theme-background',
  templateUrl: './theme-background.component.html',
  styleUrls: ['./theme-background.component.scss']
})
export class ThemeBackgroundComponent {
  pokemonParticles: Particle[] = buildParticles(14, [3, 7], [4, 9]);
  emberParticles: Particle[] = buildParticles(9, [2, 5], [5, 11]);

  constructor(public realmService: RealmService) {}
}
