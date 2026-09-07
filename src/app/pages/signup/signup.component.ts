import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../shared/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  form: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  signup(): void {
    const { email, password } = this.form.value;
    this.authService.signUp(email, password)
      .then(() => {
        this.router.navigate(['/select']);
      })
      .catch((error) => {
        this.errorMessage = this.getErrorMessage(error.code);
      });
  }

  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています。';
      case 'auth/invalid-email':
        return 'メールアドレスの形式が正しくありません。';
      case 'auth/weak-password':
        return 'パスワードは6文字以上で設定してください。';
      default:
        return '登録に失敗しました。もう一度お試しください。';
    }
  }
}