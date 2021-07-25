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
        return this.authService.isAdmin$.pipe(
            switchMap((isAdmin:boolean) => {
                if(!isAdmin) {
                    return this.router.navigate(["home"]);
                }
                return of(true);
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
