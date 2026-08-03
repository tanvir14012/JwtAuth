import { AuthService } from './../http/auth/auth-service';
import { Component, OnDestroy, OnInit, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-sign-in',
    templateUrl: './sign-in.component.html',
    styleUrls: ['./sign-in.component.css'],
    standalone: true,
    imports: [ReactiveFormsModule, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatCheckboxModule]
})
export class SignInComponent implements OnInit, OnDestroy {
  readonly signInNgForm = viewChild<NgForm>('signInNgForm');
  form!: FormGroup;
  passHide: boolean = true;
  attemptFailed: boolean = false;
  errorMsg: string = '';
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router) 
    {
    
    }

  ngOnInit(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]],
      rememberMe:[false, [Validators.required]]
    });
  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  onSubmit() {
    if(this.form.valid) {
      this.authService.signIn(this.form.value).pipe(
        takeUntil(this.lifeEnd$),
        catchError(err => {
          this.attemptFailed = true;
          this.errorMsg = "Signin failed";
          return of(err);
        })
      ).subscribe((result) => {
        if(result.succeeded) {
          this.router.navigate(["/home"]);
        }
        else {
          this.attemptFailed = true;
          this.errorMsg = result.errorMessage;
        }
      });
    }
  }

 
}
