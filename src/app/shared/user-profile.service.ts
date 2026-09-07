import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ErrorToastService } from './error-toast.service';

export interface UserProfile {
  uid: string;
  nickname: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserProfileService {

  constructor(
    private firestore: AngularFirestore,
    private errorToastService: ErrorToastService
  ) {}

  saveNickname(uid: string, nickname: string): Promise<void> {
    return this.firestore.collection('users').doc<UserProfile>(uid).set({ uid, nickname })
      .catch(err => {
        console.error('ニックネームの保存に失敗しました', err);
        this.errorToastService.show('ニックネームの保存に失敗しました');
      });
  }

  getNickname(uid: string): Observable<string | undefined> {
    return this.firestore.collection('users').doc<UserProfile>(uid).valueChanges().pipe(
      map(profile => profile?.nickname)
    );
  }
}
