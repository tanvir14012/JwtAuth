import { AuthService } from './../http/auth/auth-service';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, NgForm, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { PasswordCheckErrorMatcher } from './password-error-matcher.';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit, OnDestroy {
  @ViewChild('signUpNgForm') signUpNgForm: NgForm;
  form: FormGroup;
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
      firstName: ['', [Validators.required, Validators.pattern("^[a-zA-Z]{1,25}$")]],
      lastName: ['', [Validators.pattern("^[a-zA-Z]{1,25}$")]],
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
      ).subscribe((response) => {
        if(response.err) {
          this.signUpSuccess = false;
          this.errorMsg = response.err;
        } else {
          this.router.navigate(["/home"]);
        }
      });
    }
  }

}
