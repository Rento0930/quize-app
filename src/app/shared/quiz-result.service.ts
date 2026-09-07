import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { UserProfileService } from './user-profile.service';
import { ErrorToastService } from './error-toast.service';

export interface QuizResult {
  uid: string;
  nickname: string;
  difficulty: string;
  correctCount: number;
  questionCount: number;
  playedAt: number;
}

const MAX_RESULTS_PER_USER = 10;

@Injectable({
  providedIn: 'root'
})
export class QuizResultService {

  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private errorToastService: ErrorToastService
  ) {}

  saveResult(difficulty: string, correctCount: number, questionCount: number): void {
    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      if (!user) {
        return;
      }
      const playedAt = Date.now();
      this.userProfileService.getNickname(user.uid).pipe(take(1)).subscribe(nickname => {
        this.firestore.collection<QuizResult>('quizResults').add({
          uid: user.uid,
          nickname: nickname ?? '名無しのポケモントレーナー',
          difficulty,
          correctCount,
          questionCount,
          playedAt,
        }).then(() => this.pruneOldResults(user.uid))
          .catch(err => {
            console.error('成績の保存に失敗しました', err);
            this.errorToastService.show('成績の保存に失敗しました');
          });
      });
    });
  }

  getRanking(difficulty: string): Observable<QuizResult[]> {
    return this.firestore
      .collection<QuizResult>('quizResults', ref =>
        ref.where('difficulty', '==', difficulty).orderBy('correctCount', 'desc').limit(5)
      )
      .valueChanges();
  }

  private pruneOldResults(uid: string): void {
    this.firestore
      .collection<QuizResult>('quizResults', ref => ref.where('uid', '==', uid))
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
            doc.ref.delete().catch(err => console.error('古い成績の削除に失敗しました', err))
          );
        },
        error: err => console.error('過去の成績の取得(自動削除用)に失敗しました', err),
      });
  }
}
