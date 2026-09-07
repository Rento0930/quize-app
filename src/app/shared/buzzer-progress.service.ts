import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { ErrorToastService } from './error-toast.service';

export interface BuzzerPlayerProgress {
  id: number;
  label: string;
  key: string;
  score: number;
  lives: number;
  isNpc?: boolean;
}

export interface BuzzerProgress {
  uid: string;
  playerCount: number;
  cpuCount: number;
  questionCount: number;
  targetScore: number;
  questionIndex: number;
  players: BuzzerPlayerProgress[];
  usedCharacterNames: string[];
  updatedAt: number;
}

/**
 * NARUTO早押しの中断・再開用の進行状況。ポケモンクイズのQuizProgressServiceと同じ構造。
 * 早押しキュー・CPUの思考中といった「その問題内の一時的な状態」は保存しない。
 * 再開時は常に「保存された問題番号を、新しい問題として安全にやり直す」設計にすることで、
 * CPUの状態が壊れたり二重に動作したりすることを避けている。
 */
@Injectable({
  providedIn: 'root'
})
export class BuzzerProgressService {

  constructor(
    private firestore: AngularFirestore,
    private errorToastService: ErrorToastService
  ) {}

  saveProgress(progress: Omit<BuzzerProgress, 'updatedAt'>): void {
    this.firestore.collection<BuzzerProgress>('buzzerProgress').doc(progress.uid).set({
      ...progress,
      updatedAt: Date.now(),
    }).catch(err => {
      console.error('buzzerProgressの保存に失敗しました(Firestoreのルール未設定の可能性があります)', err);
      this.errorToastService.show('進行状況の保存に失敗しました(通信環境をご確認ください)');
    });
  }

  getProgress(uid: string): Observable<BuzzerProgress | undefined> {
    return this.firestore.collection<BuzzerProgress>('buzzerProgress').doc<BuzzerProgress>(uid).valueChanges();
  }

  clearProgress(uid: string): void {
    this.firestore.collection<BuzzerProgress>('buzzerProgress').doc(uid).delete()
      .catch(err => console.error('buzzerProgressの削除に失敗しました', err));
  }
}
