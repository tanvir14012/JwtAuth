import { switchMap } from 'rxjs/operators';
import { JwtUtils } from './auth/jwt-utils';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Observable } from "rxjs";
import { Injectable } from '@angular/core';
import { AuthService } from "./auth/auth-service";

@Injectable()
export class RequestInterceptor implements HttpInterceptor {

    constructor(private authService: AuthService) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let requestClone = req.clone({
            //withCredentials: true // For development purpose only, enables cross-site cookie/tls etc.
        });

        let accessToken = localStorage.getItem("accessToken");
        if(accessToken) {
            if(!JwtUtils.isTokenExpired(accessToken)) {
                requestClone = req.clone({
                    headers: req.headers.set("Authorization", `Bearer ${accessToken}`)
                });
            }
        }
        return next.handle(requestClone);
    }
}
