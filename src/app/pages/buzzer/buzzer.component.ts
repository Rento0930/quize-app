import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';
import { DataService } from '../../shared/data.service';
import { SoundService } from '../../shared/sound.service';
import { AuthService } from '../../shared/auth.service';
import { BuzzerProgress, BuzzerProgressService } from '../../shared/buzzer-progress.service';
import { BuzzerResult, BuzzerResultService } from '../../shared/buzzer-result.service';
import { ErrorToastService } from '../../shared/error-toast.service';

interface Character {
  name: string;
  picture: string;
  kana: string;
  background: number;
}

interface NpcProfile {
  /** 早押しの反応速度の下限(ms) */
  reactionMinMs: number;
  /** 早押しの反応速度の上限(ms) */
  reactionMaxMs: number;
  /** その問題で早押しに挑戦する確率(0〜1) */
  buzzProbability: number;
  /** 回答権を得たときに正解する確率(0〜1) */
  correctRate: number;
}

interface Player {
  id: number;
  label: string;
  key: string;
  score: number;
  lives: number;
  isNpc?: boolean;
  npcProfile?: NpcProfile;
}

interface Question {
  imageUrl: string;
  answer: string;
  kanaLetters: string[];
  backgroundUrl: string;
}

const CORRECT_POINTS = 10;
const WRONG_POINTS = 20;
const STARTING_LIVES = 3;
const QUESTION_TIME_LIMIT = 5;
const LETTER_TIME_LIMIT = 3;
const REVEAL_PAUSE_MS = 1000;

const MIN_PLAYER_COUNT = 1;
const MAX_PLAYER_COUNT = 4;
const DEFAULT_PLAYER_COUNT = 4;

// 問題数:キャラクターデータ(62体)に対して現実的な範囲に留め、無制限には選べないようにする
const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20];
const DEFAULT_QUESTION_COUNT = 15;
const MAX_QUESTION_COUNT = QUESTION_COUNT_OPTIONS[QUESTION_COUNT_OPTIONS.length - 1];

// 目標スコア:1問あたりの正解点(CORRECT_POINTS)と問題数から「到達可能な範囲」を動的に決める
const TARGET_SCORE_MIN = 10;
const TARGET_SCORE_STEP = 10;
const DEFAULT_TARGET_SCORE = 100;

// CPU人数:人間1人+CPU最大3人=4人を超えないようにする
const CPU_COUNT_OPTIONS = [1, 2, 3];
const MAX_CPU_COUNT = CPU_COUNT_OPTIONS[CPU_COUNT_OPTIONS.length - 1];
const DEFAULT_CPU_COUNT = MAX_CPU_COUNT;

const PLAYER_KEYS = ['q', 'z', 'p', 'm'];
const PLAYER_LABELS = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];

/**
 * 1人プレイ時に代わりに参加する疑似NPCのプロフィール一覧(強さ・気質はここで調整する)。
 * CPU人数を絞った場合は先頭から順に使われる(CPU1が最も速く強い個体)。
 * 反応速度・早押し確率・正答率をそれぞれ少しずつ変え、全員が同じタイミングで
 * 動く不自然さを避けている。
 */
const NPC_PROFILES: NpcProfile[] = [
  { reactionMinMs: 700, reactionMaxMs: 1800, buzzProbability: 0.78, correctRate: 0.55 },
  { reactionMinMs: 1000, reactionMaxMs: 2200, buzzProbability: 0.62, correctRate: 0.45 },
  { reactionMinMs: 1400, reactionMaxMs: 2800, buzzProbability: 0.5, correctRate: 0.35 },
];

const KATAKANA_POOL = [
  'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ',
  'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト',
  'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
  'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ',
  'ル', 'レ', 'ロ', 'ワ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ',
  'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ',
  'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ン',
  'ー', 'ッ', 'ャ', 'ュ', 'ョ',
];

@Component({
  selector: 'app-buzzer',
  templateUrl: './buzzer.component.html',
  styleUrls: ['./buzzer.component.scss']
})
export class BuzzerComponent implements OnInit, OnDestroy {
  readonly minPlayerCount = MIN_PLAYER_COUNT;
  readonly maxPlayerCount = MAX_PLAYER_COUNT;
  readonly playerCountOptions = [1, 2, 3, 4];
  readonly questionCountOptions = QUESTION_COUNT_OPTIONS;
  readonly cpuCountOptions = CPU_COUNT_OPTIONS;
  readonly targetScoreMin = TARGET_SCORE_MIN;
  readonly targetScoreStep = TARGET_SCORE_STEP;
  readonly correctPoints = CORRECT_POINTS;
  readonly wrongPoints = WRONG_POINTS;

  characters: Character[] = [];
  loading = true;
  loadError = false;
  started = false;
  finished = false;

  playerCount = DEFAULT_PLAYER_COUNT;
  questionCount = DEFAULT_QUESTION_COUNT;
  targetScore = DEFAULT_TARGET_SCORE;
  cpuCount = DEFAULT_CPU_COUNT;

  players: Player[] = [];

  questionIndex = 0;
  totalQuestions = DEFAULT_QUESTION_COUNT;
  currentQuestion: Question | null = null;
  buzzedPlayer: Player | null = null;
  /** CPU回答者の「見た目上の」思考フェーズ。既存の反応速度を分割して表示するだけで、待ち時間は追加しない */
  npcPhase: 'buzzed' | 'thinking' | null = null;
  showAnswer = false;
  wasCorrect = false;
  revealedAnswer: string | null = null;
  failedPlayerIds = new Set<number>();
  usedCharacterNames = new Set<string>();

  /** その問題で早押しした順に並ぶキュー。先頭が現在の回答者 */
  buzzQueue: Player[] = [];
  targetScoreWinner: Player | null = null;
  /** 正解が確定し、次の問題への遷移待ちになっている間はtrue(早押しを一切受け付けない) */
  private questionResolved = false;

  currentLetterIndex = 0;
  letterChoices: string[] = [];

  questionTimeRemaining = QUESTION_TIME_LIMIT;
  letterTimeRemaining = LETTER_TIME_LIMIT;

  private questionTimerHandle: any = null;
  private letterTimerHandle: any = null;
  private npcTimerHandles: any[] = [];
  private targetScoreTimerHandle: any = null;

  showPauseConfirm = false;
  savedProgress: BuzzerProgress | null = null;
  ranking: BuzzerResult[] = [];
  private uid: string | null = null;

  constructor(
    private dataService: DataService,
    private soundService: SoundService,
    private authService: AuthService,
    private buzzerProgressService: BuzzerProgressService,
    private buzzerResultService: BuzzerResultService,
    private errorToastService: ErrorToastService
  ) {
    this.players = this.buildPlayers(this.playerCount);
  }

  ngOnInit(): void {
    this.fetchCharacters();

    this.authService.getAuthState().pipe(take(1)).subscribe(user => {
      this.uid = user?.uid ?? null;
      if (!this.uid) {
        return;
      }
      this.buzzerProgressService.getProgress(this.uid).pipe(take(1)).subscribe({
        next: progress => this.savedProgress = progress ?? null,
        error: err => console.error('中断データの取得に失敗しました', err),
      });
    });
  }

  /** データ読み込み失敗画面の「再読み込み」ボタンから呼ばれる */
  retryLoad(): void {
    this.fetchCharacters();
  }

  private fetchCharacters(): void {
    this.loading = true;
    this.loadError = false;
    this.dataService.getNarutoData().subscribe({
      next: (data: Character[]) => {
        this.characters = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('NARUTOキャラクターデータの読み込みに失敗しました', err);
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.canPause()) {
      this.showPauseConfirm = true;
    }
  }

  requestPause(): void {
    if (this.canPause()) {
      this.showPauseConfirm = true;
    }
  }

  cancelPause(): void {
    this.showPauseConfirm = false;
  }

  /**
   * 中断確定:現在の状態を保存してセットアップ画面に戻る。
   * 早押しキュー・回答モーダル・CPUの思考タイマーなど「この問題内だけの一時的な状態」は
   * 保存せず全て破棄する。再開時はこの問題を新しく安全にやり直す設計にすることで、
   * CPUが二重に動いたり、回答モーダルが壊れたまま残ったりしないようにしている。
   */
  confirmPause(): void {
    this.showPauseConfirm = false;
    this.saveProgress();
    this.clearTimers();
    this.started = false;
    this.currentQuestion = null;
    this.buzzedPlayer = null;
    this.npcPhase = null;
    this.showAnswer = false;
    this.revealedAnswer = null;
    this.buzzQueue = [];
    this.failedPlayerIds = new Set<number>();
  }

  /** 保存されていた進行状況から再開する。問題内容は保存していないため、同じ問題番号を新しく出題し直す */
  resumeGame(): void {
    const progress = this.savedProgress;
    if (!progress) {
      return;
    }

    this.playerCount = progress.playerCount;
    this.cpuCount = progress.cpuCount;
    this.questionCount = progress.questionCount;
    this.targetScore = progress.targetScore;
    this.totalQuestions = progress.questionCount;

    this.players = this.buildPlayers(progress.playerCount);
    progress.players.forEach(saved => {
      const player = this.players.find(p => p.id === saved.id);
      if (player) {
        player.score = saved.score;
        player.lives = saved.lives;
      }
    });
    this.usedCharacterNames = new Set(progress.usedCharacterNames);

    this.started = true;
    this.finished = false;
    this.targetScoreWinner = null;
    // nextQuestion()が先頭でquestionIndexを+1するので、保存値の1手前に合わせておく
    this.questionIndex = progress.questionIndex - 1;
    this.nextQuestion();
  }

  private canPause(): boolean {
    return this.started && !this.finished;
  }

  private saveProgress(): void {
    if (!this.uid) {
      return;
    }
    const snapshot: Omit<BuzzerProgress, 'updatedAt'> = {
      uid: this.uid,
      playerCount: this.playerCount,
      cpuCount: this.cpuCount,
      questionCount: this.questionCount,
      targetScore: this.targetScore,
      questionIndex: this.questionIndex,
      players: this.players.map(p => ({
        id: p.id,
        label: p.label,
        key: p.key,
        score: p.score,
        lives: p.lives,
        // Firestoreはフィールド値にundefinedを許可せず、set()が例外を投げてしまう。
        // 人間プレイヤーはisNpcを一度も代入していないためundefinedになるので、
        // 明示的にfalseへ変換してから保存する。
        isNpc: !!p.isNpc,
      })),
      usedCharacterNames: Array.from(this.usedCharacterNames),
    };

    // saveProgress()はnextQuestion()やconfirmPause()の最後に呼ばれる。ここで例外が
    // 飛ぶと呼び出し元の残りの処理(画面遷移やタイマー解除)が実行されず、
    // 「中断ボタンを押しても何も起こらない」ような不具合になるため、必ず握りつぶす。
    try {
      this.buzzerProgressService.saveProgress(snapshot);
    } catch (err) {
      console.error('NARUTO早押しの進行状況の保存に失敗しました', err);
      this.errorToastService.show('進行状況の保存に失敗しました');
    }
    this.savedProgress = { ...snapshot, updatedAt: Date.now() };
  }

  private clearSavedProgress(): void {
    if (this.uid) {
      this.buzzerProgressService.clearProgress(this.uid);
    }
    this.savedProgress = null;
  }

  /** ゲーム終了時の共通処理:中断データの削除、対局結果の記録、ランキングの再取得 */
  private finishGame(): void {
    this.clearSavedProgress();

    const human = this.players.find(p => p.id === 0);
    const saved = human
      ? this.buzzerResultService.saveResult(
          this.playerCount,
          this.cpuCount,
          this.questionCount,
          this.targetScore,
          human.score,
          this.rankedPlayers()[0]?.id === 0
        )
      : Promise.resolve();

    // 保存が終わるのを待ってからランキングを取得する。先に取得してしまうと、
    // 今プレイした対局の結果がまだFirestoreに反映されておらず表示に出てこない。
    saved.then(() => this.loadRanking());
  }

  private loadRanking(): void {
    this.buzzerResultService.getRanking(this.questionCount, this.targetScore).pipe(take(1)).subscribe({
      next: ranking => this.ranking = ranking,
      error: err => console.error('NARUTOランキングの取得に失敗しました', err),
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (!key) {
      return;
    }
    const player = this.players.find(p => p.key === key);
    if (!player) {
      return;
    }
    this.buzzIn(player);
  }

  setPlayerCount(count: number): void {
    this.playerCount = count;
    this.players = this.buildPlayers(count);
  }

  setCpuCount(count: number): void {
    this.cpuCount = Math.min(MAX_CPU_COUNT, Math.max(1, count));
    if (this.isSoloWithNpc()) {
      this.players = this.buildPlayers(this.playerCount);
    }
  }

  setQuestionCount(count: number): void {
    this.questionCount = Math.min(MAX_QUESTION_COUNT, Math.max(QUESTION_COUNT_OPTIONS[0], count));
    // 目標スコアが「その問題数では到達不可能」にならないよう、上限に合わせて再クランプする
    this.targetScore = this.clampTargetScore(this.targetScore);
  }

  setTargetScore(value: number): void {
    this.targetScore = this.clampTargetScore(value);
  }

  get maxTargetScore(): number {
    return this.questionCount * CORRECT_POINTS;
  }

  get questionProgressPercent(): number {
    if (this.totalQuestions <= 0) {
      return 0;
    }
    return Math.min(100, (this.questionIndex / this.totalQuestions) * 100);
  }

  /** 現在トップのプレイヤーが目標スコアにどれだけ近づいているか */
  get targetScoreProgressPercent(): number {
    if (this.targetScore <= 0 || this.players.length === 0) {
      return 0;
    }
    const leadingScore = Math.max(...this.players.map(p => p.score));
    return Math.min(100, (leadingScore / this.targetScore) * 100);
  }

  private clampTargetScore(value: number): number {
    const max = this.maxTargetScore;
    if (!value || Number.isNaN(value)) {
      return this.targetScoreMin;
    }
    return Math.min(max, Math.max(this.targetScoreMin, Math.round(value)));
  }

  isSoloWithNpc(): boolean {
    return this.playerCount === 1;
  }

  buzzIn(player: Player): void {
    if (!this.canBuzz(player)) {
      return;
    }
    this.buzzQueue.push(player);

    if (this.buzzQueue.length === 1) {
      this.stopQuestionTimer();
      this.buzzedPlayer = player;
      this.startAnswering();
    }
  }

  canBuzz(player: Player): boolean {
    return this.started && !this.finished && !this.revealedAnswer && !this.questionResolved
      && !!this.currentQuestion
      && player.lives > 0
      && !this.failedPlayerIds.has(player.id)
      && !this.buzzQueue.some(p => p.id === player.id);
  }

  /** 早押し順位(1始まり)。まだ押していなければnull */
  buzzRank(player: Player): number | null {
    const index = this.buzzQueue.findIndex(p => p.id === player.id);
    return index === -1 ? null : index + 1;
  }

  startGame(): void {
    this.started = true;
    this.finished = false;
    this.questionIndex = 0;
    this.totalQuestions = this.questionCount;
    this.usedCharacterNames = new Set<string>();
    this.targetScoreWinner = null;
    this.nextQuestion();
  }

  playAgain(): void {
    this.resetPlayers();
    this.finished = false;
    this.startGame();
  }

  backToHome(): void {
    this.resetPlayers();
    this.finished = false;
    this.started = false;
    this.currentQuestion = null;
  }

  selectLetter(choice: string): void {
    if (!this.buzzedPlayer || this.buzzedPlayer.isNpc || !this.currentQuestion || this.showAnswer) {
      return;
    }
    this.stopLetterTimer();
    const correctLetter = this.currentQuestion.kanaLetters[this.currentLetterIndex];

    if (choice !== correctLetter) {
      this.handleWrongAnswer(this.buzzedPlayer);
      return;
    }

    this.currentLetterIndex++;
    if (this.currentLetterIndex >= this.currentQuestion.kanaLetters.length) {
      this.markCorrect(this.buzzedPlayer);
      return;
    }

    this.prepareLetterChoices();
    this.startLetterTimer();
  }

  skipQuestion(): void {
    this.stopQuestionTimer();
    this.revealThenAdvance();
  }

  rankedPlayers(): Player[] {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  private buildPlayers(humanCount: number): Player[] {
    const players: Player[] = [];
    for (let i = 0; i < humanCount; i++) {
      players.push({
        id: i,
        label: PLAYER_LABELS[i],
        key: PLAYER_KEYS[i],
        score: 0,
        lives: STARTING_LIVES,
      });
    }

    if (humanCount === 1) {
      NPC_PROFILES.slice(0, this.cpuCount).forEach((profile, index) => {
        players.push({
          id: humanCount + index,
          label: `CPU${index + 1}`,
          key: '',
          score: 0,
          lives: STARTING_LIVES,
          isNpc: true,
          npcProfile: profile,
        });
      });
    }

    return players;
  }

  private startAnswering(): void {
    this.npcPhase = null;
    if (this.buzzedPlayer?.isNpc) {
      this.scheduleNpcAnswer(this.buzzedPlayer);
      return;
    }
    this.currentLetterIndex = 0;
    this.prepareLetterChoices();
    this.startLetterTimer();
  }

  /**
   * CPUの回答フローを「早押し！」→「考え中…」の2段階で見せる。
   * 既存の反応速度(thinkMs)の中を分割して使うだけなので、テンポは変わらない。
   */
  private scheduleNpcAnswer(npc: Player): void {
    const profile = npc.npcProfile!;
    const thinkMs = 500 + Math.random() * 900;
    const buzzFlashMs = Math.min(320, thinkMs * 0.35);

    this.npcPhase = 'buzzed';
    const flashHandle = setTimeout(() => {
      if (this.buzzedPlayer?.id === npc.id) {
        this.npcPhase = 'thinking';
      }
    }, buzzFlashMs);
    this.npcTimerHandles.push(flashHandle);

    const decideHandle = setTimeout(() => {
      if (this.buzzedPlayer?.id !== npc.id) {
        return;
      }
      if (Math.random() < profile.correctRate) {
        this.markCorrect(npc);
      } else {
        this.handleWrongAnswer(npc);
      }
    }, thinkMs);
    this.npcTimerHandles.push(decideHandle);
  }

  private prepareLetterChoices(): void {
    if (!this.currentQuestion) {
      return;
    }
    const correctLetter = this.currentQuestion.kanaLetters[this.currentLetterIndex];
    const dummyPool = KATAKANA_POOL.filter(l => l !== correctLetter);
    const dummies: string[] = [];
    while (dummies.length < 3) {
      const candidate = this.pickRandom(dummyPool);
      if (!dummies.includes(candidate)) {
        dummies.push(candidate);
      }
    }
    this.letterChoices = this.shuffle([correctLetter, ...dummies]);
  }

  private markCorrect(player: Player): void {
    player.score += CORRECT_POINTS;
    this.wasCorrect = true;
    this.showAnswer = true;
    this.buzzQueue = [];
    this.questionResolved = true;
    this.soundService.playCorrect();

    if (player.score >= this.targetScore) {
      this.targetScoreWinner = player;
      this.targetScoreTimerHandle = setTimeout(() => {
        this.targetScoreTimerHandle = null;
        this.clearTimers();
        this.buzzedPlayer = null;
        this.npcPhase = null;
        this.showAnswer = false;
        this.finished = true;
        this.finishGame();
      }, REVEAL_PAUSE_MS + 800);
    }
  }

  private handleWrongAnswer(player: Player): void {
    player.score = Math.max(0, player.score - WRONG_POINTS);
    player.lives = Math.max(0, player.lives - 1);
    this.failedPlayerIds.add(player.id);
    this.wasCorrect = false;
    this.showAnswer = true;
    this.soundService.playIncorrect();

    // 誤答したプレイヤーをキューの先頭から取り除く(同じ問題には再参加できない)
    this.buzzQueue.shift();

    if (this.checkEliminationFinish()) {
      return;
    }

    setTimeout(() => this.advanceQueueAfterWrong(), REVEAL_PAUSE_MS);
  }

  private advanceQueueAfterWrong(): void {
    this.showAnswer = false;

    const next = this.buzzQueue[0];
    if (next) {
      this.buzzedPlayer = next;
      this.startAnswering();
      return;
    }

    this.buzzedPlayer = null;
    this.npcPhase = null;
    if (this.allAlivePlayersFailed()) {
      this.revealThenAdvance();
    } else {
      this.startQuestionTimer();
    }
  }

  private checkEliminationFinish(): boolean {
    if (this.players.filter(p => p.lives > 0).length <= 1 && this.players.some(p => p.lives === 0)) {
      this.finished = true;
      this.buzzedPlayer = null;
      this.npcPhase = null;
      this.showAnswer = false;
      this.finishGame();
      return true;
    }
    return false;
  }

  private allAlivePlayersFailed(): boolean {
    return this.players.filter(p => p.lives > 0).every(p => this.failedPlayerIds.has(p.id));
  }

  private revealThenAdvance(): void {
    this.revealedAnswer = this.currentQuestion?.answer ?? '';
    this.buzzedPlayer = null;
    this.npcPhase = null;
    this.showAnswer = false;
    setTimeout(() => {
      this.revealedAnswer = null;
      this.nextQuestion();
    }, REVEAL_PAUSE_MS);
  }

  nextQuestion(): void {
    this.clearTimers();
    this.questionIndex++;
    this.buzzedPlayer = null;
    this.npcPhase = null;
    this.showAnswer = false;
    this.revealedAnswer = null;
    this.currentLetterIndex = 0;
    this.failedPlayerIds = new Set<number>();
    this.buzzQueue = [];
    this.questionResolved = false;

    if (this.questionIndex > this.totalQuestions || this.players.filter(p => p.lives > 0).length <= 1) {
      this.finished = true;
      this.finishGame();
      return;
    }

    this.currentQuestion = this.buildQuestion();
    this.startQuestionTimer();
    this.scheduleNpcBuzzes();
    this.saveProgress();
  }

  private scheduleNpcBuzzes(): void {
    const questionSnapshot = this.questionIndex;
    this.players.filter(p => p.isNpc && p.lives > 0).forEach(npc => {
      const profile = npc.npcProfile!;
      if (Math.random() > profile.buzzProbability) {
        return;
      }
      const delay = profile.reactionMinMs + Math.random() * (profile.reactionMaxMs - profile.reactionMinMs);
      const handle = setTimeout(() => {
        if (this.questionIndex !== questionSnapshot || this.finished) {
          return;
        }
        this.buzzIn(npc);
      }, delay);
      this.npcTimerHandles.push(handle);
    });
  }

  private startQuestionTimer(): void {
    this.stopQuestionTimer();
    this.questionTimeRemaining = QUESTION_TIME_LIMIT;
    this.questionTimerHandle = setInterval(() => {
      this.questionTimeRemaining--;
      if (this.questionTimeRemaining <= 0) {
        this.stopQuestionTimer();
        this.revealThenAdvance();
      }
    }, 1000);
  }

  private stopQuestionTimer(): void {
    if (this.questionTimerHandle) {
      clearInterval(this.questionTimerHandle);
      this.questionTimerHandle = null;
    }
  }

  private startLetterTimer(): void {
    this.stopLetterTimer();
    this.letterTimeRemaining = LETTER_TIME_LIMIT;
    this.letterTimerHandle = setInterval(() => {
      this.letterTimeRemaining--;
      if (this.letterTimeRemaining <= 0) {
        this.stopLetterTimer();
        if (this.buzzedPlayer && !this.showAnswer && !this.buzzedPlayer.isNpc) {
          this.handleWrongAnswer(this.buzzedPlayer);
        }
      }
    }, 1000);
  }

  private stopLetterTimer(): void {
    if (this.letterTimerHandle) {
      clearInterval(this.letterTimerHandle);
      this.letterTimerHandle = null;
    }
  }

  private clearNpcTimers(): void {
    this.npcTimerHandles.forEach(handle => clearTimeout(handle));
    this.npcTimerHandles = [];
  }

  private clearTimers(): void {
    this.stopQuestionTimer();
    this.stopLetterTimer();
    this.clearNpcTimers();
    if (this.targetScoreTimerHandle) {
      clearTimeout(this.targetScoreTimerHandle);
      this.targetScoreTimerHandle = null;
    }
  }

  private resetPlayers(): void {
    this.players = this.buildPlayers(this.playerCount);
    this.targetScoreWinner = null;
  }

  private buildQuestion(): Question {
    const remaining = this.characters.filter(c => !this.usedCharacterNames.has(c.name));
    const pool = remaining.length > 0 ? remaining : this.characters;
    const character = this.pickRandom(pool);
    this.usedCharacterNames.add(character.name);

    return {
      imageUrl: character.picture,
      answer: character.name,
      kanaLetters: character.kana.split(''),
      backgroundUrl: `assets/images/naruto-bg/bg-${character.background}.jpg`,
    };
  }

  private pickRandom<T>(list: T[]): T {
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
