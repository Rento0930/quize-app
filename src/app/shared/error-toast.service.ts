import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const AUTO_HIDE_MS = 4000;

/**
 * データ読み込み・保存に失敗したときにユーザーへ軽く知らせるための共通トースト。
 * ゲーム進行を止めるものではないので、画面下に一時的に出すだけの非モーダルな通知にしている。
 */
@Injectable({
  providedIn: 'root'
})
export class ErrorToastService {
  private message$$ = new BehaviorSubject<string | null>(null);
  message$ = this.message$$.asObservable();
  private hideHandle: any = null;

  show(message: string): void {
    this.message$$.next(message);
    if (this.hideHandle) {
      clearTimeout(this.hideHandle);
    }
    this.hideHandle = setTimeout(() => {
      this.message$$.next(null);
      this.hideHandle = null;
    }, AUTO_HIDE_MS);
  }

  dismiss(): void {
    if (this.hideHandle) {
      clearTimeout(this.hideHandle);
      this.hideHandle = null;
    }
    this.message$$.next(null);
  }
}
