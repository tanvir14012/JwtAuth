import { NgIf } from '@angular/common';
import { Component, OnInit, ViewEncapsulation, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../http/auth/auth-service';
import { AuthStatus } from '../http/auth/auth-types';

@Component({
    selector: 'auth-unlock-session',
    templateUrl: './unlock-session.component.html',
    styleUrls: ['./unlock-session.component.css'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [ReactiveFormsModule, NgIf, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
})
export class AuthUnlockSessionComponent implements OnInit
{
    readonly unlockSessionNgForm = viewChild<NgForm>('unlockSessionNgForm');

    alert: { type: string; message: string } = {
        type   : 'success',
        message: ''
    };
    private _authStatus: AuthStatus | null = null;
    showAlert: boolean = false;
    unlockSessionForm!: FormGroup;
    lifeEnd$: Subject<boolean> = new Subject();

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _formBuilder: FormBuilder,
        private _router: Router
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the user's name
        this._authService.authStatus.subscribe((authStatus) => {
            this._authStatus = authStatus;
        });

        // Create the form
        this.unlockSessionForm = this._formBuilder.group({
            email    : [
                {
                    value   : this._authStatus.userEmail,
                    disabled: true
                }
            ],
            password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(64),
                Validators.pattern("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^\\da-zA-Z]).*$")]]
        });
    }

    ngOnDestroy(): void {
        this.lifeEnd$.next(true);
        this.lifeEnd$.complete();
      }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Unlock
     */
    unlock(): void
    {
        // Return if the form is invalid
        if ( this.unlockSessionForm.invalid )
        {
            this.unlockSessionForm.markAllAsTouched();
            return;
        }

        // Disable the form
        this.unlockSessionForm.disable();

        // Hide the alert
        this.showAlert = false;

        this._authService.unlockSession({
            value: this.unlockSessionForm.get('password').value
        }).subscribe(
            (result) => {


            if(result.unlockSuccess) {
                const redirectURL = this._activatedRoute.snapshot
                    .queryParamMap.get('redirectURL') || "/home";

                // Navigate to the redirect url
                this._router.navigateByUrl(redirectURL);
            }
            else {
                // Re-enable the form
                this.unlockSessionForm.enable();

                // Reset the form
                this.unlockSessionNgForm()?.resetForm({
                    email: {
                        value   : this._authStatus?.userEmail,
                        disabled: true
                    }
                });

                // Set the alert
                this.alert = {
                    type   : 'error',
                    message: result.errorMessage
                };

                // Show the alert
                this.showAlert = true;
            }
                
            }
        );
    }

    /**
     * Sign out
     */
    signout(): void {
        this._authService.signOut().pipe(
            takeUntil(this.lifeEnd$)
          ).subscribe((success: boolean) => {
            if (success) {
              this._router.navigate(["/sign-in"]);
            }
          });
    }
}
