import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  styles: [`
    .login-shell {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at top, rgba(92, 157, 255, 0.18), transparent 30%),
        linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%);
    }

    .login-card {
      width: min(420px, 100%);
      border-radius: 24px;
      padding: 10px;
    }
  `],
  template: `
    <div class="login-shell">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Login</mat-card-title>
          <mat-card-subtitle>Access your wedding plans</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" style="display:grid; gap:14px; margin-top:18px;">
            <mat-form-field appearance="fill">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email">
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password">
            </mat-form-field>
          </form>

          <div *ngIf="error()" style="color:#b91c1c; font-size:13px; margin-top:8px;">
            {{ error() }}
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-flat-button color="primary" [disabled]="form.invalid || submitting()" (click)="submit()">
            {{ submitting() ? 'Signing in...' : 'Login' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `
})
export class LoginPageComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  submitting = signal(false);
  error = signal('');

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit() {
    if (this.form.invalid) return;

    this.error.set('');
    this.submitting.set(true);
    try {
      const value = this.form.getRawValue();
      await this.auth.login({ email: value.email, password: value.password });
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('Invalid credentials.');
    } finally {
      this.submitting.set(false);
    }
  }
}
