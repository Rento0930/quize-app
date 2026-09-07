import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { DataService } from '../../shared/data.service';
import { AuthService } from '../../shared/auth.service';

@Component({
  selector: 'app-top',
  templateUrl: './top.component.html',
  styleUrls: ['./top.component.scss']
})
export class TopComponent implements OnInit {
  decorationImages: string[] = [];

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 装飾用の画像取得なので、失敗しても画面は問題なく表示できる(装飾なしになるだけ)。
    // 失敗時に例外で他の初期化処理を止めないよう、エラーハンドラだけ付けておく。
    this.dataService.getPokemonData().subscribe({
      next: (data: any[]) => {
        this.decorationImages = this.pickRandomImages(data, 6);
      },
      error: (err) => console.error('トップ画面の装飾画像データの取得に失敗しました', err),
    });
  }

  start(): void {
    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      this.router.navigate([user ? '/select' : '/login']);
    });
  }

  private pickRandomImages(pokemonList: any[], count: number): string[] {
    const shuffled = [...pokemonList].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(p =>
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.no}.png`
    );
  }
}
