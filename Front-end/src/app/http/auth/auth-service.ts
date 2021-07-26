import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of, BehaviorSubject, Observable } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import { catchError, delay, map, retryWhen, scan, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { JwtUtils } from './jwt-utils';

@Injectable()
export class AuthService {
    public isAuthenticated$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    public isAdmin$: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
    constructor(private httpClient: HttpClient) {
        
    }

    /**
     * Creates a user account and signs in.  The 'observe' option is necessary for storing the refresh token.
     * @param creds 
     */
    public signUp(creds: {firstName: string, lastName:string, email: string, password: string, confirmPassword: string}): Observable<any> {  

        const httpOptions:any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };

        return this.httpClient.post(`${environment.API_ROOT}/account/signup`, creds, httpOptions)
                   .pipe(
                       switchMap((response: any) => {
                          if(response.body?.tokenString) {
                              localStorage.setItem("accessToken", response.body.tokenString);
                              this.isAuthenticated$.next(true);
                              this.isAdmin$.next(false);
                          }
                          return of(response.body);
                       })
                   );

    }

    /**
     * Sign-in request, upon success an access token is set in local storage and a refresh token
     * is set as http only cookie by backend. The 'observe' option is necessary for storing the 
     * refresh token cookie.
     * @param creds Login credentials
     */
    public signIn(creds: {email: string, password: string}): Observable<any> {

        const httpOptions:any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };

        return this.httpClient.post(`${environment.API_ROOT}/account/login`, creds, httpOptions)
                   .pipe(
                       switchMap((response: any) => {
                          if(response.body?.tokenString) {
                              localStorage.setItem("accessToken", response.body.tokenString);
                              this.isAuthenticated$.next(true);

                              //Checks the admin status as well
                              return this.isAdmin().pipe(
                                  map(v => response.body)
                              );
                          }
                          return of(response.body);
                       })
                   );
    }

    /**
     * A POST request is sent to delete the http only cookie, the access token in local storeage gets deleted.
     */
    public signOut(): Observable<boolean> {
        const httpOptions:any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };
         this.httpClient.post(`${environment.API_ROOT}/account/logout`, {}, httpOptions);
         localStorage.removeItem("accessToken");
         this.isAuthenticated$.next(false);
         this.isAdmin$.next(false);
         return of(true);
    }

    /**
     * Gets a new access token by using the refresh token set as http only cookie.
     *  The 'observe' option is necessary for storing the refresh token cookie.
     */
    private refreshUserTokens(): Observable<boolean> {

        const httpOptions:any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            }),
            observe: "response"
        };

        return this.httpClient.post(`${environment.API_ROOT}/account/refreshUserTokens`, {}, httpOptions)
            .pipe(
                catchError(err => {
                    //No connection, client side errors
                    if(err.status === 0 && err.error instanceof ProgressEvent){
                        return of(false);
                    }

                    localStorage.removeItem("accessToken");
                    this.isAuthenticated$.next(false);
                    this.isAdmin$.next(false);
                    return of(false);
                }),
                switchMap((response: any) => {
                    if(response.body?.tokenString) {
                        localStorage.setItem("accessToken", response.body.tokenString);
                        this.isAuthenticated$.next(true);

                        //Checks the admin status as well
                        return this.isAdmin().pipe(
                            map(v => true)
                        );
                    }
                    this.isAuthenticated$.next(false);
                    this.isAdmin$.next(false);
                    return of(false);
                })
            );
    }

    /**
     * 
     * Checks if the access token is valid
     */
    private validateAccessToken(tokenString: string): Observable<boolean> {
        const httpOptions:any = {
            headers: new HttpHeaders({
                "Content-Type": "application/json"
            })
        };

        return this.httpClient.post(`${environment.API_ROOT}/account/validateAccessToken`, JSON.stringify(tokenString), httpOptions)
        .pipe(
            retryWhen((error: Observable<any>) => {
                return error.pipe(
                    scan((count) => {
                        count++;
                        if(count <3) {
                            return count;
                        }
                        else {
                            throw error;
                        }
                    }, 0),
                    delay(1000)
                )
            }),
            catchError(err => {
                return of(false);
            }),
            switchMap((response: any) => {
                if(response) {
                    this.isAuthenticated$.next(true);

                    //Checks the admin status as well
                    return this.isAdmin().pipe(
                        map(v => true)
                    );
                }
                this.isAuthenticated$.next(false);
                this.isAdmin$.next(false);
                return of(false);
            })
        );
    }

    /**
     * Checks whether the user is logged-in
     */
    public check(): Observable<boolean> {

        const accessToken = localStorage.getItem("accessToken");
        if(!accessToken) {
            this.isAuthenticated$.next(false);
            this.isAdmin$.next(false);
            return of(false);
        }

        try {
            let expired = JwtUtils.isTokenExpired(accessToken);
            if(!expired) {
                return this.validateAccessToken(accessToken);
            }
            return this.refreshUserTokens();
            
        }
        catch(err) {
            localStorage.removeItem("accessToken");
            this.isAuthenticated$.next(false);
            this.isAdmin$.next(false);
            return of(false);
        }
        
    }

    /**
     * 
     * Checks if the user is an administrator
     */
    private isAdmin(): Observable<boolean> {
        return this.httpClient.get<boolean>(`${environment.API_ROOT}/account/isAdmin`).pipe(
            catchError(err => {
              this.isAdmin$.next(false);
              localStorage.setItem("adminStatus", "false");
              return of(false);
            }),
            switchMap(adminStatus => {
                if(adminStatus){
                    this.isAdmin$.next(true);
                    localStorage.setItem("adminStatus", "true");
                    return of(true);
                }
                this.isAdmin$.next(false);
                localStorage.setItem("adminStatus", "false");
                return of(false);
            })
          );  
    }
}
