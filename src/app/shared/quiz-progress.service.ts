import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { ErrorToastService } from './error-toast.service';

export interface AskedPokemonProgress {
  no: number;
  name: string;
  questionTypeLabels: string[];
}

export interface QuizProgress {
  uid: string;
  difficulty: string;
  questionIndex: number;
  correctCount: number;
  hintsRemaining: number;
  askedPokemon: AskedPokemonProgress[];
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuizProgressService {

  constructor(
    private firestore: AngularFirestore,
    private errorToastService: ErrorToastService
  ) {}

  saveProgress(
    uid: string,
    difficulty: string,
    questionIndex: number,
    correctCount: number,
    hintsRemaining: number,
    askedPokemon: AskedPokemonProgress[]
  ): void {
    this.firestore.collection<QuizProgress>('quizProgress').doc(uid).set({
      uid,
      difficulty,
      questionIndex,
      correctCount,
      hintsRemaining,
      askedPokemon,
      updatedAt: Date.now(),
    }).catch(err => {
      console.error('quizProgressの保存に失敗しました', err);
      this.errorToastService.show('進行状況の保存に失敗しました(通信環境をご確認ください)');
    });
  }

  getProgress(uid: string): Observable<QuizProgress | undefined> {
    return this.firestore.collection<QuizProgress>('quizProgress').doc<QuizProgress>(uid).valueChanges();
  }

  clearProgress(uid: string): void {
    this.firestore.collection<QuizProgress>('quizProgress').doc(uid).delete()
      .catch(err => console.error('quizProgressの削除に失敗しました', err));
  }
}
