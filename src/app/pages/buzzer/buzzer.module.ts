import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { BuzzerRoutingModule } from './buzzer-routing.module';
import { BuzzerComponent } from './buzzer.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    BuzzerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SharedModule,
    BuzzerRoutingModule
  ]
})
export class BuzzerModule { }
