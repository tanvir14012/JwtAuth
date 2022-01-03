import { AuthStatus, SignInStatus, UserType } from './auth-types';
import { switchMap } from 'rxjs/operators';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { Injectable } from '@angular/core';
import { AuthService } from "./auth-service";
import { of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SessionLockGuard implements CanActivate, CanActivateChild, CanLoad{
    constructor(
        private authService: AuthService,
        private router: Router) 
    {

    }

    private checkStatus(): Observable<boolean> {
        return this.authService.checkAuthStatus().pipe(
            switchMap((authStatus: AuthStatus) => {
                if(authStatus.signInStatus == SignInStatus.SessionLocked) {
                    return of(true);
                }
                else {
                    this.router.navigate['home'];
                    return of(false);
                }
                
            })
        );
                
    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkStatus();
    }
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkStatus();
    }
    canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkStatus();
    }
}
