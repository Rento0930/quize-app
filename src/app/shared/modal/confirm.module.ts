import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalModule } from 'ngx-bootstrap/modal';
import { ConfirmComponent } from './confirm/confirm.component';
import { ConfirmService } from './confirm.service';

@NgModule({
  declarations: [ConfirmComponent],
  imports: [CommonModule, ModalModule.forRoot()],
  providers: [ConfirmService],
})
export class ConfirmModule { }