import { AuthService } from './auth/auth-service';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {

    constructor(
        private authService: AuthService,
        private router: Router) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // req = req.clone({
        //     withCredentials: true // For development purpose only, enables cross-site cookie/tls etc.
        // });

        return next.handle(req).pipe(
            catchError((err) => {
                if (err instanceof HttpErrorResponse) {
                    switch (err.status) {
                        case 0:
                            //Client side errors eg. no connection
                            if(err.error instanceof ProgressEvent) {
                                this.router.navigate(["no-connection"]);
                            }
                            break;
                        case 401:
                            return this.authService.check()
                                .pipe(
                                    switchMap((isAuthenticated: boolean) => {
                                        if(isAuthenticated) {
                                            const accessToken = localStorage.getItem("accessToken");
                                            const requestClone = req.clone({
                                                headers: req.headers.set("Authorization", `Bearer ${accessToken}`),
                                            });
                                            return next.handle(requestClone);
                                        }
                                        return throwError(err);
                                    })
                                );
                        default :
                            break;
                    }
                }
                return throwError(err);
            })
        )
    }
}
