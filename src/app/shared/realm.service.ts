import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter, map, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RealmService {
  private isNaruto$$ = new BehaviorSubject<boolean>(false);
  isNaruto$ = this.isNaruto$$.asObservable();

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/buzzer')),
      startWith(this.router.url.startsWith('/buzzer'))
    ).subscribe(isNaruto => this.isNaruto$$.next(isNaruto));
  }

  get isNaruto(): boolean {
    return this.isNaruto$$.value;
  }
}
