import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private afAuth: AngularFireAuth) {}

  // ユーザー登録（サインアップ）
  signUp(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.afAuth.createUserWithEmailAndPassword(email, password);
  }

  // ログイン
  login(email: string, password: string): Promise<firebase.auth.UserCredential> {
    return this.afAuth.signInWithEmailAndPassword(email, password);
  }

  // ログアウト
  logout(): Promise<void> {
    return this.afAuth.signOut();
  }

  // 現在のログイン状態を取得（ログインしているかどうかを常時監視）
  getAuthState(): Observable<firebase.User | null> {
    return this.afAuth.authState;
  }
}