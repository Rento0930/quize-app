import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs/operators';
import confetti from 'canvas-confetti';
import { DataService } from '../../shared/data.service';
import { ConfirmService } from '../../shared/modal/confirm.service'; // 追加
import { QuizResultService } from '../../shared/quiz-result.service';
import { AppSettingsService } from '../../shared/app-settings.service';
import { AuthService } from '../../shared/auth.service';
import { AskedPokemonProgress, QuizProgressService } from '../../shared/quiz-progress.service';
import { SoundService } from '../../shared/sound.service';
import { ErrorToastService } from '../../shared/error-toast.service';

type InfoField =
  | 'no' | 'form' | 'types' | 'abilities' | 'hiddenAbilities' | 'evolutions'
  | 'height' | 'weight' | 'genus' | 'color';
type QuestionType = 'name' | 'type' | 'ability' | 'height' | 'weight' | 'genus' | 'color';

type EffectType = 'confetti' | 'stars' | 'shake' | 'rain';

interface ResultTheme {
  title: string;
  message: string;
  imageUrl: string;
  effectType: EffectType;
}

interface DifficultyConfig {
  questionCount: number;
  showImage: boolean;
  hintAvailable: boolean;
  infoFields: InfoField[];
  questionTypes: QuestionType[];
}

const DIFFICULTY_CONFIG: Record<string, DifficultyConfig> = {
  '初級': {
    questionCount: 5,
    showImage: true,
    hintAvailable: false,
    infoFields: [
      'no', 'form', 'types', 'abilities', 'hiddenAbilities', 'evolutions',
      'height', 'weight', 'genus', 'color',
    ],
    questionTypes: ['name'],
  },
  '中級': {
    questionCount: 10,
    showImage: false,
    hintAvailable: true,
    infoFields: ['no', 'abilities', 'height', 'weight'],
    questionTypes: ['name', 'type', 'height', 'weight'],
  },
  '上級': {
    questionCount: 15,
    showImage: false,
    hintAvailable: false,
    infoFields: ['no', 'types', 'abilities', 'height', 'weight', 'genus', 'color'],
    questionTypes: ['name', 'type', 'ability', 'height', 'weight', 'genus', 'color'],
  },
};

const QUESTION_TEXT: Record<QuestionType, string> = {
  name: 'このポケモンの名前は何でしょうか？',
  type: 'このポケモンのタイプは何でしょうか？',
  ability: 'このポケモンの特性は何でしょうか？',
  height: 'このポケモンの高さは何でしょうか？',
  weight: 'このポケモンの重さは何でしょうか？',
  genus: 'このポケモンの分類は何でしょうか？',
  color: 'このポケモンの色は何でしょうか？',
};

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  name: '名前',
  type: 'タイプ',
  ability: '特性',
  height: '高さ',
  weight: '重さ',
  genus: '分類',
  color: '色',
};

interface AskedPokemonEntry {
  no: number;
  name: string;
  imageUrl: string;
  questionTypeLabels: string[];
}

@Component({
  selector: 'app-hoge',
  templateUrl: './hoge.component.html',
  styleUrls: ['./hoge.component.scss']
})
export class HogeComponent implements OnInit, OnDestroy {
  form: FormGroup;
  pokemonList: any[] = [];
  choices: string[] = [];
  correctAnswer = '';
  questionText = '';
  loading = false;

  config: DifficultyConfig = DIFFICULTY_CONFIG['初級'];
  difficultyName = '初級';
  questionType: QuestionType = 'name';
  showName = false;
  questionIndex = 1;
  correctCount = 0;
  finished = false;
  imageHintRevealed = false;
  choicesReduced = false;
  maxHints = 5;
  hintsRemaining = 5;
  theme: ResultTheme | null = null;
  showPauseConfirm = false;
  loadError = false;
  private uid: string | null = null;
  private effectIntervalHandle: any = null;
  private askedPokemonMap = new Map<number, AskedPokemonEntry>();
  /** trueの間はstartQuiz()がヒント回数・出題図鑑をリセットしない(中断復帰用) */
  private resuming = false;

  get askedPokemonList(): AskedPokemonEntry[] {
    return Array.from(this.askedPokemonMap.values());
  }

  /** ローディング中でも終了後でもない、実際にクイズに回答している最中かどうか */
  get isPlaying(): boolean {
    return !this.loading && !this.finished && !this.loadError;
  }

  get questionProgressPercent(): number {
    if (!this.config.questionCount) {
      return 0;
    }
    return Math.min(100, ((this.questionIndex - 1) / this.config.questionCount) * 100);
  }

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private confirmService: ConfirmService, // 追加
    private quizResultService: QuizResultService,
    private appSettingsService: AppSettingsService,
    private authService: AuthService,
    private quizProgressService: QuizProgressService,
    private soundService: SoundService,
    private route: ActivatedRoute,
    private router: Router,
    private errorToastService: ErrorToastService
  ) {
    this.form = this.fb.group({
      number: [null],
      name: [null],
      types: [null],
      form: [null],
      abilities: [null],
      hiddenAbilities: [null],
      evolutions: [null],
      height: [null],
      weight: [null],
      genus: [null],
      color: [null],
    });
  }

  registerAnswer(answer: string): void {
    const isCorrect = answer === this.correctAnswer;
    if (isCorrect) {
      this.correctCount++;
      this.soundService.playCorrect();
    } else {
      this.soundService.playIncorrect();
    }
    const modalRef = this.confirmService.show(isCorrect, this.correctAnswer);
    modalRef.onHidden?.subscribe(() => {
      this.questionIndex++;
      this.saveProgress();
      this.loadNextQuestion();
    });
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.isPlaying) {
      this.showPauseConfirm = true;
    }
  }

  requestPause(): void {
    if (this.isPlaying) {
      this.showPauseConfirm = true;
    }
  }

  confirmPause(): void {
    this.showPauseConfirm = false;
    this.saveProgress();
    this.router.navigate(['/select']);
  }

  cancelPause(): void {
    this.showPauseConfirm = false;
  }

  private saveProgress(): void {
    if (!this.uid) {
      return;
    }
    // confirmPause()はこの直後にrouter.navigate()するため、保存処理で例外が発生しても
    // 画面遷移自体は必ず行われるようにする(NARUTO側で発生した「保存に失敗すると
    // 中断処理全体が止まる」不具合と同種の問題を未然に防ぐため)。
    try {
      this.quizProgressService.saveProgress(
        this.uid,
        this.difficultyName,
        this.questionIndex,
        this.correctCount,
        this.hintsRemaining,
        this.toAskedPokemonProgress()
      );
    } catch (err) {
      console.error('ポケモンクイズの進行状況の保存に失敗しました', err);
      this.errorToastService.show('進行状況の保存に失敗しました');
    }
  }

  private toAskedPokemonProgress(): AskedPokemonProgress[] {
    return this.askedPokemonList.map(p => ({
      no: p.no,
      name: p.name,
      questionTypeLabels: p.questionTypeLabels,
    }));
  }

  revealImageHint(): void {
    if (this.hintsRemaining <= 0) {
      return;
    }
    this.imageHintRevealed = true;
    this.hintsRemaining--;
  }

  reduceChoicesHint(): void {
    if (this.hintsRemaining <= 0 || this.choicesReduced || this.choices.length <= 2) {
      return;
    }
    const wrongChoice = this.choices.find(c => c !== this.correctAnswer);
    if (wrongChoice) {
      this.choices = this.choices.filter(c => c !== wrongChoice);
    }
    this.choicesReduced = true;
    this.hintsRemaining--;
  }

  ngOnInit(): void {
    const requestedDifficulty = this.route.snapshot.queryParamMap.get('difficulty');
    const isResume = this.route.snapshot.queryParamMap.get('resume') === 'true';

    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      this.uid = user?.uid ?? null;

      if (isResume && this.uid) {
        this.quizProgressService.getProgress(this.uid).pipe(take(1)).subscribe(progress => {
          if (progress) {
            this.difficultyName = progress.difficulty;
            this.questionIndex = progress.questionIndex;
            this.correctCount = progress.correctCount;
            this.hintsRemaining = progress.hintsRemaining ?? this.appSettingsService.getHintLimit(progress.difficulty);
            this.askedPokemonMap = new Map(
              (progress.askedPokemon ?? []).map(p => [p.no, {
                no: p.no,
                name: p.name,
                imageUrl: this.pokemonImageUrl(p.no),
                questionTypeLabels: p.questionTypeLabels,
              }])
            );
            this.resuming = true;
          } else {
            this.difficultyName = DIFFICULTY_CONFIG[requestedDifficulty ?? ''] ? (requestedDifficulty as string) : '初級';
          }
          this.startQuiz();
        });
        return;
      }

      this.difficultyName = DIFFICULTY_CONFIG[requestedDifficulty ?? ''] ? (requestedDifficulty as string) : '初級';
      this.startQuiz();
    });
  }

  private startQuiz(): void {
    this.config = DIFFICULTY_CONFIG[this.difficultyName];
    this.maxHints = this.appSettingsService.getHintLimit(this.difficultyName);
    if (!this.resuming) {
      this.hintsRemaining = this.maxHints;
      this.askedPokemonMap = new Map<number, AskedPokemonEntry>();
    }

    this.loading = true;
    this.loadError = false;
    this.dataService.getPokemonData().subscribe({
      next: (data: any) => {
        this.pokemonList = data;
        this.loadNextQuestion();
      },
      error: (err) => {
        console.error('ポケモンデータの読み込みに失敗しました', err);
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  /** データ読み込み失敗画面の「再読み込み」ボタンから呼ばれる */
  retryLoad(): void {
    this.startQuiz();
  }

  private loadNextQuestion(): void {
    if (this.questionIndex > this.config.questionCount) {
      this.finished = true;
      this.loading = false;
      this.quizResultService.saveResult(this.difficultyName, this.correctCount, this.config.questionCount);
      if (this.uid) {
        this.quizProgressService.clearProgress(this.uid);
      }
      this.theme = this.calculateResultTheme(this.correctCount, this.config.questionCount);
      this.triggerEffect(this.theme.effectType);
      return;
    }

    this.loading = true;
    this.imageHintRevealed = false;
    this.choicesReduced = false;

    setTimeout(() => {
      this.questionType = this.pickRandom(this.config.questionTypes);
      this.questionText = QUESTION_TEXT[this.questionType];
      this.showName = this.questionType !== 'name';

      const candidates = this.getCandidates(this.questionType);
      const pokemon = this.pickRandom(candidates);
      this.recordAskedPokemon(pokemon, this.questionType);

      switch (this.questionType) {
        case 'name':
          this.correctAnswer = pokemon['name'];
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => p['name']);
          break;
        case 'type':
          this.correctAnswer = pokemon['types'].join('/');
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => p['types'].join('/'));
          break;
        case 'ability':
          this.correctAnswer = pokemon['abilities'][0];
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => p['abilities'][0]);
          break;
        case 'height':
          this.correctAnswer = `${pokemon['height']}m`;
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => `${p['height']}m`);
          break;
        case 'weight':
          this.correctAnswer = `${pokemon['weight']}kg`;
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => `${p['weight']}kg`);
          break;
        case 'genus':
          this.correctAnswer = pokemon['genus'];
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => p['genus']);
          break;
        case 'color':
          this.correctAnswer = pokemon['color'];
          this.choices = this.buildChoices(candidates, this.correctAnswer, p => p['color']);
          break;
      }

      this.form.patchValue({
        number: pokemon['no'],
        name: pokemon['name'],
        types: pokemon['types'],
        form: pokemon['form'],
        abilities: pokemon['abilities'],
        hiddenAbilities: pokemon['hiddenAbilities'],
        evolutions: pokemon['evolutions'],
        height: pokemon['height'],
        weight: pokemon['weight'],
        genus: pokemon['genus'],
        color: pokemon['color'],
      });

      this.loading = false;
    }, 500);
  }

  private calculateResultTheme(score: number, total: number): ResultTheme {
    const percentage = (score / total) * 100;

    if (percentage === 100) {
      return {
        title: '完璧！',
        message: '全問正解！完璧な知識です！',
        imageUrl: 'assets/images/result-perfect.jpg',
        effectType: 'confetti',
      };
    } else if (percentage >= 50) {
      return {
        title: 'すごい！',
        message: '素晴らしい成績！あと少しで満点！',
        imageUrl: 'assets/images/result-great.jpg',
        effectType: 'stars',
      };
    } else if (percentage > 0) {
      return {
        title: '気にしない！',
        message: '惜しい！復習して再挑戦しよう！',
        imageUrl: 'assets/images/result-good.jpg',
        effectType: 'shake',
      };
    } else {
      return {
        title: 'ゲームオーバー…',
        message: '伸びしろ無限大！次は本気を出そう！',
        imageUrl: 'assets/images/result-zero.jpg',
        effectType: 'rain',
      };
    }
  }

  ngOnDestroy(): void {
    this.stopEffects();
  }

  stopEffects(): void {
    if (this.effectIntervalHandle) {
      clearInterval(this.effectIntervalHandle);
      this.effectIntervalHandle = null;
    }
    confetti.reset();
  }

  private triggerEffect(effectType: EffectType): void {
    if (effectType === 'confetti') {
      const sakuraColors = ['#ffb7c5', '#ffc1cc', '#fff0f5', '#ff8fab'];
      let ticks = 0;
      this.effectIntervalHandle = setInterval(() => {
        confetti({
          particleCount: 6,
          startVelocity: 5,
          gravity: 0.4,
          drift: (Math.random() - 0.5) * 2,
          spread: 100,
          ticks: 300,
          scalar: 1,
          shapes: ['circle'],
          colors: sakuraColors,
          origin: { x: Math.random(), y: -0.1 },
        });
        ticks++;
        if (ticks > 30) {
          clearInterval(this.effectIntervalHandle);
          this.effectIntervalHandle = null;
        }
      }, 150);
      confetti({ particleCount: 100, spread: 100, startVelocity: 40, colors: sakuraColors, origin: { y: 0.5 } });
      return;
    }

    if (effectType === 'stars') {
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 35,
        shapes: ['star'],
        colors: ['#FFD700', '#FFEC8B', '#FFF8DC'],
        origin: { y: 0.6 },
      });
      return;
    }

    if (effectType === 'rain') {
      let ticks = 0;
      this.effectIntervalHandle = setInterval(() => {
        confetti({
          particleCount: 12,
          startVelocity: 25,
          gravity: 2.5,
          drift: -0.2,
          angle: 260,
          spread: 8,
          ticks: 150,
          scalar: 0.4,
          shapes: ['circle'],
          colors: ['#90a4ae', '#78909c', '#607d8b', '#455a64'],
          origin: { x: Math.random(), y: -0.1 },
        });
        ticks++;
        if (ticks > 30) {
          clearInterval(this.effectIntervalHandle);
          this.effectIntervalHandle = null;
        }
      }, 100);
    }
  }

  private recordAskedPokemon(pokemon: any, questionType: QuestionType): void {
    const no = pokemon['no'];
    const label = QUESTION_TYPE_LABEL[questionType];
    const existing = this.askedPokemonMap.get(no);
    if (existing) {
      if (!existing.questionTypeLabels.includes(label)) {
        existing.questionTypeLabels.push(label);
      }
      return;
    }
    this.askedPokemonMap.set(no, {
      no,
      name: pokemon['name'],
      imageUrl: this.pokemonImageUrl(no),
      questionTypeLabels: [label],
    });
  }

  private pokemonImageUrl(no: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${no}.png`;
  }

  private getCandidates(questionType: QuestionType): any[] {
    if (questionType === 'ability') {
      return this.pokemonList.filter(p => p['abilities']?.length > 0);
    }
    if (questionType === 'height' || questionType === 'weight') {
      return this.pokemonList.filter(p => p['height'] != null && p['weight'] != null);
    }
    return this.pokemonList;
  }

  private buildChoices(list: any[], correctAnswer: string, key: (p: any) => string): string[] {
    const dummies: string[] = [];
    while (dummies.length < 3) {
      dummies.push(this.pickDummyBy(list, key, correctAnswer, dummies));
    }
    return this.shuffle([correctAnswer, ...dummies]);
  }

  private pickRandom<T>(list: T[]): T {
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  private pickDummyBy(list: any[], key: (p: any) => string, correctAnswer: string, existingDummies: string[]): string {
    let dummy: string;
    do {
      dummy = key(this.pickRandom(list));
    } while (dummy === correctAnswer || existingDummies.includes(dummy));
    return dummy;
  }

  private shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

}
