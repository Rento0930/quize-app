import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * ゲーム中断の確認ダイアログ(ポケモンクイズ/NARUTO早押し共通)。
 * 見た目はvar(--surface-strong)等のテーマ変数に乗るだけなので、
 * ポケモン世界/NARUTO世界どちらでも自動的にそのテーマのカードデザインになる。
 * ダイアログを表示している間はタイマー等を止めていない(キャンセル時に
 * そのまま続行できるようにするため)。実際に状態を確定するのは
 * confirmPauseを受け取った呼び出し元の責務。
 */
@Component({
  selector: 'app-pause-dialog',
  templateUrl: './pause-dialog.component.html',
  styleUrls: ['./pause-dialog.component.scss']
})
export class PauseDialogComponent {
  @Input() title = 'ゲームを中断しますか？';
  @Input() message = '中断すると、ここまでの進行状況を保存してホームに戻ります。';
  @Output() confirmPause = new EventEmitter<void>();
  @Output() cancelPause = new EventEmitter<void>();
}
