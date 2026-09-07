 import { NgModule } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';

  import { StartRoutingModule } from './start-routing.module';
  import { StartComponent } from './start.component';

  @NgModule({
    declarations: [
      StartComponent
    ],
    imports: [
      CommonModule,
      FormsModule,
      StartRoutingModule
    ]
  })
  export class StartModule { }

