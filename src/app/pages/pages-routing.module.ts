import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagesComponent } from './pages.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { AuthGuard } from '../shared/auth.guard';
import { NoAuthGuard } from '../shared/no-auth.guard';

const routes: Routes = [
  {
    path: '',
    component: PagesComponent,
    children: [
      { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
      { path: 'signup', component: SignupComponent, canActivate: [NoAuthGuard] },
      {
        path: '',
        loadChildren: () =>
          import('./top/top.module').then((m) => m.TopModule),
      },
      {
        path: '',
        canActivateChild: [AuthGuard],
        children: [
          {
            path: 'hoge',
            loadChildren: () =>
              import('./hoge/hoge.module').then((m) => m.HogeModule),
          },
          {
            path: 'results',
            loadChildren: () =>
              import('./results/results.module').then((m) => m.ResultsModule),
          },
          {
            path: 'settings',
            loadChildren: () =>
              import('./settings/settings.module').then((m) => m.SettingsModule),
          },
          {
            path: 'select',
            loadChildren: () =>
              import('./start/start.module').then((m) => m.StartModule),
          },
          {
            path: 'buzzer',
            loadChildren: () =>
              import('./buzzer/buzzer.module').then((m) => m.BuzzerModule),
          },
        ],
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
