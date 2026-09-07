import { Component } from '@angular/core';
import { AppSettingsService } from './shared/app-settings.service';
import { RealmService } from './shared/realm.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-web-sample';

  constructor(
    private appSettingsService: AppSettingsService,
    private realmService: RealmService
  ) {
    this.appSettingsService.init();
    this.realmService.isNaruto$.subscribe(isNaruto => {
      document.body.classList.toggle('realm-naruto', isNaruto);
      document.body.classList.toggle('realm-pokemon', !isNaruto);
    });
  }
}

  