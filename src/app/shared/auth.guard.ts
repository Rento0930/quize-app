 import { Injectable } from '@angular/core';
  import { CanActivate, CanActivateChild, Router } from
  '@angular/router';
  import { Observable } from 'rxjs';
  import { map, take } from 'rxjs/operators';
  import { AuthService } from './auth.service';

  @Injectable({
    providedIn: 'root'
  })
  export class AuthGuard implements CanActivate,
  CanActivateChild {

    constructor(
      private authService: AuthService,
      private router: Router
    ) {}

    canActivate(): Observable<boolean> {
      return this.authService.getAuthState().pipe(
        take(1),
        map(user => {
          if (user) {
            return true;
          }
          this.router.navigate(['/login']);
          return false;
        })
      );
    }

    canActivateChild(): Observable<boolean> {
      return this.canActivate();
    }
  }