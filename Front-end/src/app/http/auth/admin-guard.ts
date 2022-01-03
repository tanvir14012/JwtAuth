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
export class AdminGuard implements CanActivate, CanActivateChild, CanLoad{
    constructor(
        private authService: AuthService,
        private router: Router) 
    {

    }

    private checkAdminRole(): Observable<boolean> {
        return this.authService.checkAuthStatus().pipe(
            switchMap((authStatus: AuthStatus) => {
                if(authStatus.signInStatus == SignInStatus.Authenticated 
                    && authStatus.userType.toString() == '0') {
                    return of(true);
                }
                this.router.navigate[''];
                return of(false);
            })
        );
                
    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAdminRole();
    }
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAdminRole();
    }
    canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAdminRole();
    }
}
