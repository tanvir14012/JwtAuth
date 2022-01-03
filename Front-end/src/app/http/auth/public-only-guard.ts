import { switchMap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChild, CanLoad, Route, Router, RouterStateSnapshot, UrlSegment, UrlTree } from '@angular/router';
import { CanActivate } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { of } from 'rxjs';
import { AuthStatus, SignInStatus } from './auth-types';

@Injectable({
    providedIn: 'root'
})
export class PublicOnlyGuard implements CanActivate, CanActivateChild, CanLoad {

    constructor(
        private authService: AuthService,
        private router: Router) 
    {
        
    }

    private checkAuthentication(): Observable<boolean>{
         // Check the authentication status
         return this.authService.checkAuthStatus()
         .pipe(
             switchMap((authStatus: AuthStatus) => {
                 switch(authStatus.signInStatus ) {
                      case SignInStatus.Authenticated: 
                        // Redirect to home, otherwise it'll stay in the same url and loop.
                        this.router.navigate(['home']);
                        return of(false); 
                      case SignInStatus.SessionLocked: 
                        // Redirect to the root, otherwise it'll stay in the same url and loop.
                        this.router.navigate(['unlock-session']);
                        return of(true);
                      default: 
                        return of(true);                                   
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
