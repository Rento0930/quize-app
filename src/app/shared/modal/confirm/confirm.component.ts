import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent implements OnInit {
  isCorrect = false;
  correctAnswer: string | null = null;

  constructor(public bsModalRef: BsModalRef) {}

  ngOnInit(): void {
    // 不正解時は正解を読む時間を確保するため、表示時間を少し長めにする
    const displayMs = this.isCorrect ? 1000 : 1600;
    setTimeout(() => {
      this.bsModalRef.hide();
    }, displayMs);
  }
}