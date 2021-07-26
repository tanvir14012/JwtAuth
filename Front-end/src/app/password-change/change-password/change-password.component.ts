import { MatSnackBar } from '@angular/material/snack-bar';
import { PasswordChangeErrorMatcher } from './../password-change-error-mathcer';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, NgForm, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PasswordCheckErrorMatcher } from 'src/app/sign-up/password-error-matcher.';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent implements OnInit {
  @ViewChild('changePassNgForm') changePassNgForm: NgForm;
  form: FormGroup;
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
  oldNewPasswordErrorMatcher: PasswordChangeErrorMatcher;
  oldPassHide: boolean = true;
  passHide: boolean = true;
  confPassHide: boolean = true;
  changeSuccess = true;
  errorMsg: string = "";
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router) {
    this.passwordErrorMatcher = new PasswordCheckErrorMatcher();
    this.oldNewPasswordErrorMatcher = new PasswordChangeErrorMatcher();

  }

  ngOnInit(): void {
    this.form = this.fb.group({
      oldPassword: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]],
      password: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]],
      confirmPassword: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]]
    }, {
      validators: [this.passwordCheck, this.oldNewpasswordCheck]
    });

  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  onSubmit() {
    if (this.form.valid) {
      this.httpClient.post(`${environment.API_ROOT}/account/changePassword`, {
        oldPassword: this.form.get("oldPassword")?.value,
        newPassword: this.form.get("password")?.value
      }).pipe(
        takeUntil(this.lifeEnd$)
      ).subscribe((response: any) => {
        if (!response) {
          this.changeSuccess = false;
          this.errorMsg = "Password change failed. The given old password is incorrect";
        } else {
          this.router.navigate(["/profile"]);
          this.snackBar.open("Password has been changed successfully", undefined, {
            duration: 2500
          });
        }
      });
    }
  }

}
