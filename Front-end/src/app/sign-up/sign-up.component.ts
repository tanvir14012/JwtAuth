import { AuthService } from './../http/auth/auth-service';
import { Component, OnDestroy, OnInit, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, NgForm, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { PasswordCheckErrorMatcher } from './password-error-matcher.';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'app-sign-up',
    templateUrl: './sign-up.component.html',
    styleUrls: ['./sign-up.component.css'],
    standalone: true,
    imports: [ReactiveFormsModule, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule]
})
export class SignUpComponent implements OnInit, OnDestroy {
  readonly signUpNgForm = viewChild<NgForm>('signUpNgForm');
  form!: FormGroup;
  passwordCheck: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    let password = control.get("password")?.value,
      confirmPass = control.get("confirmPassword")?.value;
    return (password === confirmPass) ? null : { mismatch: true };
  };
  passwordErrorMatcher: PasswordCheckErrorMatcher;
  passHide: boolean = true;
  confPassHide: boolean = true;
  signUpSuccess = true;
  errorMsg: string = "";
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router) 
    {
      this.passwordErrorMatcher = new PasswordCheckErrorMatcher();
    }
 

  ngOnInit(): void {

    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      lastName: ['', [Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]],
      confirmPassword: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]]
    }, {
      validators: this.passwordCheck
    });
  
  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  onSubmit() {
    if(this.form.valid) {
      this.authService.signUp(this.form.value).pipe(
        takeUntil(this.lifeEnd$)
      ).subscribe((result) => {
        if(!result.succeeded) {
          this.signUpSuccess = false;
          this.errorMsg = result.errorMessage;
        } else {
          this.router.navigate(["/home"]);
        }
      },
      (err) => {
        this.signUpSuccess = false;
        this.errorMsg = "The sign up request failed. Please try again.";
      });
    }
  }

}
