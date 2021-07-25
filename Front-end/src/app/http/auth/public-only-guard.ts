import { switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { of } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class PublicOnlyGuard implements CanActivate, CanActivateChild, CanLoad {

    constructor(
        private authService: AuthService,
        private router: Router) 
    {
        
    }

    private checkNoAuthentication(redirectUrl: string): Observable<boolean>{
        return this.authService.isAuthenticated$.pipe(
            switchMap((authenticated: boolean) => {
                if(authenticated) {
                    return this.router.navigate([redirectUrl]);
                }
                return of(true);
            })
        );
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
       return this.checkNoAuthentication("/");
    }
    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
         return this.checkNoAuthentication("/");
    }
    canLoad(route: Route, segments: UrlSegment[]): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return this.checkNoAuthentication("/");
    }
}
