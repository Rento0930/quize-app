import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { HogeRoutingModule } from './hoge-routing.module';
import { HogeComponent } from './hoge.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [
    HogeComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatProgressSpinnerModule,
    SharedModule,
    HogeRoutingModule
  ]
})
export class HogeModule { }
