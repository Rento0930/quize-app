import { Component } from '@angular/core';
import { RealmService } from '../realm.service';

@Component({
  selector: 'app-side-menu-component',
  templateUrl: './side-menu-component.component.html',
  styleUrls: ['./side-menu-component.component.scss']
})
export class SideMenuComponentComponent {
  constructor(public realmService: RealmService) {}
}
