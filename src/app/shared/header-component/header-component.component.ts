import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { RealmService } from '../realm.service';

@Component({
  selector: 'app-header-component',
  templateUrl: './header-component.component.html',
  styleUrls: ['./header-component.component.scss']
})
export class HeaderComponentComponent {
  user$: Observable<firebase.User | null>;

  constructor(
    private authService: AuthService,
    private router: Router,
    public realmService: RealmService
  ) {
    this.user$ = this.authService.getAuthState();
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
