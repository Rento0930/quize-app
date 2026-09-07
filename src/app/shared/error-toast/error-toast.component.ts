import { Component } from '@angular/core';
import { ErrorToastService } from '../error-toast.service';

@Component({
  selector: 'app-error-toast',
  templateUrl: './error-toast.component.html',
  styleUrls: ['./error-toast.component.scss']
})
export class ErrorToastComponent {
  constructor(public errorToastService: ErrorToastService) {}
}
