import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { of } from 'rxjs';
import { QuizResult, QuizResultService } from '../../shared/quiz-result.service';
import { AuthService } from '../../shared/auth.service';
import { ErrorToastService } from '../../shared/error-toast.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})
export class ResultsComponent implements OnInit {
  difficulties = ['初級', '中級', '上級'];
  selectedDifficulty = '初級';
  ranking$: Observable<QuizResult[]>;
  currentUid: string | null = null;

  constructor(
    private quizResultService: QuizResultService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private errorToastService: ErrorToastService
  ) {
    const requestedDifficulty = this.route.snapshot.queryParamMap.get('difficulty');
    if (requestedDifficulty && this.difficulties.includes(requestedDifficulty)) {
      this.selectedDifficulty = requestedDifficulty;
    }
    this.ranking$ = this.loadRanking(this.selectedDifficulty);
  }

  ngOnInit(): void {
    // authStateは完了しないObservableなので、take(1)を付けずにsubscribeすると
    // このコンポーネントが再生成されるたびに購読が積み重なってしまう(メモリリーク)。
    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      this.currentUid = user?.uid ?? null;
    });
  }

  selectDifficulty(difficulty: string): void {
    this.selectedDifficulty = difficulty;
    this.ranking$ = this.loadRanking(difficulty);
  }

  private loadRanking(difficulty: string): Observable<QuizResult[]> {
    return this.quizResultService.getRanking(difficulty).pipe(
      catchError(err => {
        console.error('ランキングの取得に失敗しました', err);
        this.errorToastService.show('ランキングの取得に失敗しました');
        return of([]);
      })
    );
  }

  medalFor(rank: number): string {
    if (rank === 0) return '🥇';
    if (rank === 1) return '🥈';
    if (rank === 2) return '🥉';
    return '';
  }

  formatDate(playedAt: number): string {
    return new Date(playedAt).toLocaleString('ja-JP');
  }
}
