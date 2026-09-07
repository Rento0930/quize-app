import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { HeaderComponentComponent } from './header-component/header-component.component';
import { SideMenuComponentComponent } from './side-menu-component/side-menu-component.component';
import { ThemeBackgroundComponent } from './theme-background/theme-background.component';
import { PauseDialogComponent } from './pause-dialog/pause-dialog.component';
import { ErrorToastComponent } from './error-toast/error-toast.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    HeaderComponentComponent,
    SideMenuComponentComponent,
    ThemeBackgroundComponent,
    PauseDialogComponent,
    ErrorToastComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    RouterModule
  ],
  exports: [
    HeaderComponentComponent,
    SideMenuComponentComponent,
    ThemeBackgroundComponent,
    PauseDialogComponent,
    ErrorToastComponent
  ]
})
export class SharedModule { }