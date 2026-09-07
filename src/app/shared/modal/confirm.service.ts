import { Injectable } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { ConfirmComponent } from './confirm/confirm.component';

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {
  constructor(private modalService: BsModalService) {}

  show(isCorrect: boolean, correctAnswer: string | null = null): BsModalRef {
    const modalRef = this.modalService.show(ConfirmComponent);
    if (modalRef.content) {
      modalRef.content.isCorrect = isCorrect;
      modalRef.content.correctAnswer = isCorrect ? null : correctAnswer;
    }
    return modalRef;
  }
}