import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { TopRoutingModule } from './top-routing.module';
import { TopComponent } from './top.component';

@NgModule({
  declarations: [
    TopComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    TopRoutingModule
  ]
})
export class TopModule { }
