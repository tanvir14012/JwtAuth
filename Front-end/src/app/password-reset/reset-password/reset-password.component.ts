import { MatSnackBar } from '@angular/material/snack-bar';
import { UserModel } from './../../profile/userModel';
import { PasswordCheckErrorMatcher } from './../../sign-up/password-error-matcher.';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  users: UserModel[] = [];
  passwordCheck: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    let password = control.get("password")?.value,
      confirmPass = control.get("confirmPassword")?.value;
    return (password === confirmPass) ? null : { mismatch: true };
  };
  oldNewpasswordCheck: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    let password = control.get("password")?.value,
      confirmPass = control.get("oldPassword")?.value;
    return (password !== confirmPass) ? null : { oldNewSame: true };
  };
  passwordErrorMatcher: PasswordCheckErrorMatcher;
  passHide: boolean = true;
  confPassHide: boolean = true;
  resetSuccess = true;
  errorMsg: string = "";
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router) {
    this.form = fb.group({
      userId: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]],
      confirmPassword: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]]
    }, {
      validators: this.passwordCheck
    });
    this.passwordErrorMatcher = new PasswordCheckErrorMatcher();
  }


  ngOnInit(): void {

    /**
    * Get the list of user
    */
    this.httpClient.get(`${environment.API_ROOT}/profile/getAll`)
      .pipe(
        takeUntil(this.lifeEnd$)
      ).subscribe((userList: any) => {
        this.users = userList;
      });
  }

  onSubmit() {
    if (this.form.valid) {
      this.httpClient.post(`${environment.API_ROOT}/account/resetPassword`, {
        userId: this.form.get("userId")?.value,
        Password: this.form.get("password")?.value
      }).pipe(
        takeUntil(this.lifeEnd$)
      ).subscribe((response: any) => {
        if (!response) {
          this.resetSuccess = false;
          this.errorMsg = "Password reset failed. Please try again later";
        } else {
          this.router.navigate(["/users"]);
          this.snackBar.open("Password has been reset successfully", undefined, {
            duration: 2500
          } );
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }
}
