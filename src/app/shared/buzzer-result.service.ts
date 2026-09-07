import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserProfileService } from './user-profile.service';
import { ErrorToastService } from './error-toast.service';

export interface BuzzerResult {
  uid: string;
  nickname: string;
  playerCount: number;
  cpuCount: number;
  questionCount: number;
  targetScore: number;
  /** questionCount・targetScoreから作る絞り込みキー(例:"10-50")。同じ条件の対局だけを比較するために使う */
  configKey: string;
  score: number;
  won: boolean;
  playedAt: number;
}

const MAX_RESULTS_PER_USER = 10;

/**
 * NARUTO早押しの対局結果。QuizResultService(ポケモン側)と同じ構造・同じ運用方針を採用している。
 * - 記録するのは常に「自分(id=0、ログイン中のアカウント)」のスコア
 * - 1人あたり最新10件を超えたら古い記録から自動削除
 * - ランキングは「問題数・目標スコアが同じ対局」だけに絞ったスコア降順の上位10件
 *   (問題数・目標スコアが違うと到達できるスコアの上限や終了条件が変わり、
 *   単純比較が公平ではないため。ポケモン側のdifficulty別ランキングと同じ考え方)
 */
@Injectable({
  providedIn: 'root'
})
export class BuzzerResultService {

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private errorToastService: ErrorToastService
  ) {}

  /**
   * 保存(ニックネーム取得→書き込み→古い記録の整理)が完了してから解決するPromiseを返す。
   * 呼び出し側がこれを待たずに直後にgetRanking()すると、今回の対局結果がまだ
   * Firestoreに反映されておらずランキングに出てこない、という競合が起きるため、
   * 「完了を待てる」形にしている(失敗時もエラー処理まで終えたうえで解決する)。
   */
  saveResult(
    playerCount: number,
    cpuCount: number,
    questionCount: number,
    targetScore: number,
    score: number,
    won: boolean
  ): Promise<void> {
    return new Promise<void>(resolve => {
      this.authService.getAuthState().pipe(take(1)).subscribe({
        next: user => {
          if (!user) {
            resolve();
            return;
          }
          const playedAt = Date.now();
          this.userProfileService.getNickname(user.uid).pipe(take(1)).subscribe({
            next: nickname => {
              this.firestore.collection<BuzzerResult>('buzzerResults').add({
                uid: user.uid,
                nickname: nickname ?? '名無しの忍者',
                playerCount,
                cpuCount,
                questionCount,
                targetScore,
                configKey: BuzzerResultService.buildConfigKey(questionCount, targetScore),
                score,
                won,
                playedAt,
              }).then(() => this.pruneOldResults(user.uid))
                .catch(err => {
                  console.error('NARUTO対局結果の保存に失敗しました', err);
                  this.errorToastService.show('対局結果の保存に失敗しました');
                })
                .finally(() => resolve());
            },
            // ここでエラーになった場合もPromiseを必ず解決させる。解決しないと、
            // finishGame()側のsaved.then(() => this.loadRanking())が永久に呼ばれなくなる。
            error: err => {
              console.error('ニックネームの取得に失敗し、対局結果を保存できませんでした', err);
              this.errorToastService.show('対局結果の保存に失敗しました');
              resolve();
            },
          });
        },
        error: err => {
          console.error('認証状態の取得に失敗し、対局結果を保存できませんでした', err);
          resolve();
        },
      });
    });
  }

  /** questionCount・targetScoreが一致する対局だけに絞ったスコア上位10件 */
  getRanking(questionCount: number, targetScore: number): Observable<BuzzerResult[]> {
    const configKey = BuzzerResultService.buildConfigKey(questionCount, targetScore);
    return this.firestore
      .collection<BuzzerResult>('buzzerResults', ref =>
        ref.where('configKey', '==', configKey).orderBy('score', 'desc').limit(10)
      )
      .valueChanges();
  }

  private static buildConfigKey(questionCount: number, targetScore: number): string {
    return `${questionCount}-${targetScore}`;
  }

  private pruneOldResults(uid: string): void {
    this.firestore
      .collection<BuzzerResult>('buzzerResults', ref => ref.where('uid', '==', uid))
      .get()
      .pipe(take(1))
      .subscribe({
        next: snapshot => {
          if (snapshot.size <= MAX_RESULTS_PER_USER) {
            return;
          }
          const sortedDocs = snapshot.docs.sort(
            (a, b) => (b.data().playedAt) - (a.data().playedAt)
          );
          sortedDocs.slice(MAX_RESULTS_PER_USER).forEach(doc =>
            doc.ref.delete().catch(err => console.error('古いNARUTO結果の削除に失敗しました', err))
          );
        },
        error: err => console.error('過去のNARUTO結果の取得(自動削除用)に失敗しました', err),
      });
  }
}
