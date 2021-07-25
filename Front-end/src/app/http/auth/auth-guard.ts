import { switchMap } from 'rxjs/operators';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { Injectable } from '@angular/core';
import { AuthService } from "./auth-service";
import { of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild, CanLoad{
    constructor(
        private authService: AuthService,
        private router: Router) 
    {

    }

    private checkAuthentication(redirectUrl: string): Observable<boolean> {
        return this.authService.isAuthenticated$.pipe(
            switchMap((authenticated: boolean) => {
                if(!authenticated) {
                    return this.router.navigate([redirectUrl]);
                }
                return of(true);
            })
        );
    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication("/sign-in");
    }
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication("/sign-in");
    }
    canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkAuthentication("/sign-in");
    }
}
