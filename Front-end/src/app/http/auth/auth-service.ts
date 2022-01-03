import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { of, BehaviorSubject, Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { catchError, delay, finalize, map, retryWhen, scan, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthUtils } from '../auth.utils';
import { AuthStatus, SignInStatus } from './auth-types';

@Injectable()
export class AuthService {
    public isAuthenticated$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    public isAdmin$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    private _authStatus$: ReplaySubject<AuthStatus> = new ReplaySubject<AuthStatus>(1);
    
    constructor(private _httpClient: HttpClient,
        private _router: Router) {
        
    }

    /**
     * Setter & getter for access token
     */
     set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    get authStatus(): Observable<AuthStatus> {
        return this._authStatus$ as Observable<AuthStatus>;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

     /**
     * Sign up
     *
     * @param user
     */
      signUp(creds: {firstName: string, lastName:string, email: string, password: string, confirmPassword: string
      }): Observable<any> {
  
          const httpOptions:any = {
              headers: new HttpHeaders({
                  "Content-Type": "application/json"
              }),
              observe: "response"
          };
  
          return this._httpClient.post(`${environment.API_ROOT}/account/signup`, creds, httpOptions)
                     .pipe(
                         switchMap((resp: any) => {
                          const signinResult = resp.body;
  
                          if(signinResult.succeeded) {
                              this.accessToken = signinResult.accessToken;
                              const authStatus = this.populateAuthStatus(signinResult.accessToken);
                              if(authStatus) {
                                  this._authStatus$.next(authStatus);
                              }
                          }
                          // Return a new observable with the response
                          return of(signinResult);
                         })
                     );
  
      }
      
    /**
     * Sign in
     *
     * @param credentials
     */
    signIn(credentials: { email: string; password: string, rememberMe: boolean }): Observable<any> {

        const httpOptions: any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };

        return this._httpClient.post(`${environment.API_ROOT}/account/signin`, credentials, httpOptions).pipe(
            switchMap((resp: any) => {
                const signinResult = resp.body;

                if(signinResult.succeeded) {
                    this.accessToken = signinResult.accessToken;
                    const authStatus = this.populateAuthStatus(signinResult.accessToken);
                    if(authStatus) {
                        this._authStatus$.next(authStatus);
                    }
                }
                // Return a new observable with the response
                return of(signinResult);
            })
        );
    }


    /**
     * Get an access token from the refresh token, rotate the refresh token.
     */
    refreshUserTokens(): Observable<any> {
        const httpOptions: any = {
            observe: "response"
        };

        // Renew access token
        return this._httpClient.post(`${environment.API_ROOT}/account/refreshUserTokens`, {}, httpOptions)
            .pipe(
                //Retry failed requests 2 times
                retryWhen((error: Observable<any>) => {
                    return error.pipe(
                        scan((count: number) => {
                            count++;
                            if (count < 3) {
                                return count;
                            }
                            else {
                                throw error;
                            }
                        }, 0),
                        delay(1000)
                    )
                }),
                catchError(() => {
                    localStorage.clear();
                    // Navigate to root route
                    this._router.navigate(['']);
                    location.reload();
                    return of({
                        refreshSucceeded: false
                    });
                }),
                switchMap((response: any) => {
                    const refreshResult = response.body;

                    if (refreshResult.refreshSucceeded) {
                        this.accessToken = refreshResult.accessToken;
                        
                        //Refresh the auth status
                        const authStatus = this.populateAuthStatus(refreshResult.accessToken);
                        if(authStatus) {
                            this._authStatus$.next(authStatus);
                        }

                        //Navigate to unlock-session page if session is locked
                        if(refreshResult.isSessionLocked) {
                            this._router.navigate(['unlock-session'], { queryParams: { redirectURL: this._router.url}});
                        }
                    }
                    else if (refreshResult.signedOut) {
                        // Remove the access token from the local storage
                        localStorage.clear();
                        // Navigate to root route
                        this._router.navigate(['']);
                        location.reload();
                    }
                    return of(refreshResult);
                })
            );
    }

    /**
     * Sign out
     */
    signOut(): Observable<boolean> {

        const httpOptions: any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };

        return this._httpClient.post(`${environment.API_ROOT}/account/signout`,
            {}, httpOptions).pipe(
                switchMap(() => {
                    return of(true)
                }),
                catchError((err) => {
                    //HTTP 401 occurs when access token get expired and remember me is false.
                    return of(err.status === 401);
                }),
                finalize(() => {
                    // Remove the access token and other state data from the local storage
                    localStorage.clear();
                    this._router.navigate(['sign-in']);
                })
            );

    }

   

    /**
     * Lock session
     */

    lockSession(): Observable<any> {
        return this._httpClient.post<any>(`${environment.API_ROOT}/account/lockSession`, {}).pipe(
            switchMap((result: any) => {
                if(result.isSessionLocked) {
                    this.accessToken = result.accessToken;
                    this.checkAuthStatus();
                    this._router.navigate(['unlock-session'], { queryParams: { redirectURL: this._router.url}});
                }
                else if(result.isSignedOut) {
                    // Remove the access token from the local storage
                    localStorage.clear();
                    // Navigate to root route
                    this._router.navigate(['']);
                }
                location.reload();

                return of(result);
            }),
            catchError(() => {
                return of(null);
            })
        )
    }

    /**
     * Unlock session
     *
     * @param credentials
     */
    unlockSession(password: { value: string}): Observable<any> {
        return this._httpClient.post(`${environment.API_ROOT}/account/unlockSession`, password).pipe(
            switchMap((result: any) => {
                if(result.unlockSuccess) {
                    this.accessToken = result.accessToken;
                    this.checkAuthStatus();
                }

                return of(result);
            }),
            catchError(() => {
                return of({
                    unlockSuccess: false,
                    errorMessage: "Something went wrong! Please try later."
                });
            })
        );
    }

    /**
     * Confirm verification email
     */
    confirmEmail(model: { email: string, token: string}): Observable<boolean> {
        return this._httpClient.post<boolean>(`${environment.API_ROOT}/account/confirmEmailAddress`, model).pipe(
            catchError(() => {
                return of(false);
            })
        );
    }

    /**
     * Check the authentication status
     */
    checkAuthStatus(): Observable<AuthStatus> {

        // Check the access token availability
        if (!this.accessToken) {

            this._authStatus$.next({
                signInStatus: SignInStatus.Unauthenticated
            });
            return this._authStatus$;
        }
        else {
            const authStatus = this.populateAuthStatus(this.accessToken);
            if (authStatus) {
                this._authStatus$.next(authStatus);
                return this._authStatus$;
            }
            else {
                // Remove the access token from the local storage
                localStorage.clear();

                this._authStatus$.next({
                    signInStatus: SignInStatus.Unauthenticated
                });
                return this._authStatus$;
            }

        }
    }

    /**
     * Populates the authentication status and account info from the access token.
     * @param accessToken 
     * @returns 
     */
    private populateAuthStatus(accessToken: string): AuthStatus {
        try {
            const accessTokenPayload = AuthUtils.decodeToken(accessToken);
            let authStatus: AuthStatus = {
                signInStatus: accessTokenPayload.isSessionLocked === "true" ? 
                    SignInStatus.SessionLocked: SignInStatus.Authenticated,
                userId: parseInt(accessTokenPayload.nameid),
                userEmail: accessTokenPayload.email,
                userPhone: accessTokenPayload.phoneNumber,
                claims: accessTokenPayload.claims,
                roles: accessTokenPayload.role,
                rememberMe: accessTokenPayload.isPersistent === "true",
                userType: parseInt(accessTokenPayload.usertype),
                sessionLockEnabled: accessTokenPayload.sessionLockEnabled === "true",
                isSessionLocked: accessTokenPayload.isSessionLocked === "true"
            };

            return authStatus;
        }
        catch (err) {
            return null;
        }

    }

}
