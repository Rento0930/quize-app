import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { DataService } from '../../shared/data.service';
import { AuthService } from '../../shared/auth.service';
import { UserProfileService } from '../../shared/user-profile.service';
import { QuizProgress, QuizProgressService } from '../../shared/quiz-progress.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss']
})
export class StartComponent implements OnInit {
  difficulties = ['初級', '中級', '上級'];
  selectedDifficulty = '初級';
  decorationImages: string[] = [];
  nicknameInput = '';
  progress: QuizProgress | null = null;
  private uid: string | null = null;

  constructor(
    private router: Router,
    private dataService: DataService,
    private authService: AuthService,
    private userProfileService: UserProfileService,
    private quizProgressService: QuizProgressService
  ) {}

  ngOnInit(): void {
    // 装飾用の画像取得なので、失敗しても画面は問題なく表示できる(装飾なしになるだけ)。
    this.dataService.getPokemonData().subscribe({
      next: (data: any[]) => {
        this.decorationImages = this.pickRandomImages(data, 5);
      },
      error: (err) => console.error('選択画面の装飾画像データの取得に失敗しました', err),
    });

    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      if (!user) {
        return;
      }
      this.uid = user.uid;
      this.userProfileService.getNickname(user.uid).pipe(take(1)).subscribe({
        next: nickname => this.nicknameInput = nickname ?? '',
        error: err => console.error('ニックネームの取得に失敗しました', err),
      });
      this.quizProgressService.getProgress(user.uid).pipe(take(1)).subscribe({
        next: progress => this.progress = progress ?? null,
        error: err => console.error('中断データの取得に失敗しました', err),
      });
    });
  }

  startQuiz(): void {
    const nickname = this.nicknameInput.trim();
    if (nickname && this.uid) {
      this.userProfileService.saveNickname(this.uid, nickname);
    }
    this.router.navigate(['/hoge'], { queryParams: { difficulty: this.selectedDifficulty } });
  }

  resumeQuiz(): void {
    if (!this.progress) {
      return;
    }
    this.router.navigate(['/hoge'], { queryParams: { difficulty: this.progress.difficulty, resume: 'true' } });
  }

  private pickRandomImages(pokemonList: any[], count: number): string[] {
    const shuffled = [...pokemonList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(p =>
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.no}.png`
    );
  }
}
