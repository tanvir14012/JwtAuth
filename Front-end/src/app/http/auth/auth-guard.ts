import { switchMap } from 'rxjs/operators';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { Injectable } from '@angular/core';
import { AuthService } from "./auth-service";
import { of } from 'rxjs';
import { AuthStatus, SignInStatus } from './auth-types';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad{
    constructor(
        private authService: AuthService,
        private router: Router) 
    {

    }

    private checkAuthentication(): Observable<boolean> {
         // Check the authentication status
         return this.authService.checkAuthStatus()
         .pipe(
             switchMap((authStatus: AuthStatus) => {
                 switch(authStatus.signInStatus ) {
                      case SignInStatus.Authenticated: 
                        return of(true);
                      default:
                        this.router.navigate(['sign-in']);
                        return of(false);                                   
                 }
             })
         );
    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication();
    }
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication();
    }
    canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication();
    }
}
