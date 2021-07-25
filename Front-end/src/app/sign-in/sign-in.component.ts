import { AuthService } from './../http/auth/auth-service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, Subject, Subscription } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit, OnDestroy {
  form: FormGroup;
  passHide: boolean = true;
  attemptFailed: boolean = false;
  serverError: boolean = false;
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router) 
    {
    this.form = fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      password: ['', [Validators.required, Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).{6,64}$")]]
    });
   }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  ngOnInit(): void {
  }

  onSubmit() {
    if(this.form.valid) {
      this.authService.signIn(this.form.value).pipe(
        takeUntil(this.lifeEnd$),
        catchError(err => {
          this.serverError = true;
          return of(err);
        })
      ).subscribe((response) => {
        if(response.tokenString) {
          this.router.navigate(["/home"]);
        }
        else {
          this.attemptFailed = !this.serverError;
        }
      });
    }
  }

 
}
