import { AuthStatus, SignInStatus, UserType } from './http/auth/auth-types';
import { Router } from '@angular/router';
import { AuthService } from './http/auth/auth-service';
import { Component, HostListener, ChangeDetectorRef } from '@angular/core';
import { of, Subject, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { takeUntil, catchError, switchMap, distinctUntilChanged, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Front-end';
  lifeEnd$: Subject<any> = new Subject();
  isAdmin: boolean = false;
  isAuthenticated: boolean = false;
  private _userIdle: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  private _timeoutId: any = null;
  private _authStatus: AuthStatus;

  constructor(
    private router: Router,
    private authService: AuthService,
    private changeDetectorRef:ChangeDetectorRef) { 

  }

  ngOnInit(): void {

    /**
     * Checks admin role status
     *  */
    this.authService.authStatus.pipe(
      takeUntil(this.lifeEnd$)
    ).subscribe((authStatus: AuthStatus) => {
      this._authStatus = authStatus;
      this.isAuthenticated = authStatus && authStatus.signInStatus && authStatus.signInStatus == SignInStatus.Authenticated;
      if (authStatus && authStatus.userType != null && authStatus.userType.toString() === '0') {
        this.isAdmin = true;
      }
      else {
        this.isAdmin = false;
      }
      this.changeDetectorRef.markForCheck();
    });

    //Idle time elapsed, subscription
    this._userIdle.pipe(takeUntil(this.lifeEnd$)).subscribe(
      () => {
          if(this._authStatus && this._authStatus.signInStatus == SignInStatus.Authenticated) {
                  this.authService.lockSession().pipe(take(1)).subscribe(() => {
                      this.start();
                  });
          }
          
      }
  );

  //Start timer
  this.start();
  }

  signOut(): void {
    this.authService.signOut().pipe(
      takeUntil(this.lifeEnd$)
    ).subscribe((success: boolean) => {
      if (success) {
        this.router.navigate(["/sign-in"]);
      }
    });
  }

  /**
     * Mouse or keyboard activity
     */
   @HostListener('window:keydown')
   @HostListener('window:mousemove')
   @HostListener('window:mousedown')
   @HostListener('window:click')
   @HostListener('window:touchstart')
   @HostListener('window:mousewheel')
   checkUserActivity() {
       this.reset();
       this.start();
   }

   /**
    * Start timer
    */
   start(): void {
       this._timeoutId = setTimeout(() => {
           this._userIdle.next(true);
       }, 1000 * 60 * 5); //5 minutes
   }

   /**
    * Reset timer
    */
   reset(): void {

       if(this._timeoutId) {
           clearTimeout(this._timeoutId);         //JS method
       }
      
   }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }
}
