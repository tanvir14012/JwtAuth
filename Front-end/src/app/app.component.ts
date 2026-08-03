import { NgIf } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { ReplaySubject, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

import { AuthService } from './http/auth/auth-service';
import { AuthStatus, SignInStatus } from './http/auth/auth-types';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [NgIf, RouterLink, RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class AppComponent {
  readonly lifeEnd$ = new Subject<boolean>();
  readonly isAdmin = signal(false);
  readonly isAuthenticated = signal(false);
  private _userIdle: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  private _timeoutId: ReturnType<typeof setTimeout> | null = null;
  private _authStatus: AuthStatus | null = null;

  constructor(
    private router: Router,
    private authService: AuthService) {}

  ngOnInit(): void {

    /**
     * Checks admin role status
     *  */
    this.authService.authStatus.pipe(
      takeUntil(this.lifeEnd$)
    ).subscribe((authStatus: AuthStatus) => {
      this._authStatus = authStatus;
      this.isAuthenticated.set(!!authStatus && authStatus.signInStatus === SignInStatus.Authenticated);
      if (authStatus && authStatus.userType != null && authStatus.userType.toString() === '0') {
        this.isAdmin.set(true);
      }
      else {
        this.isAdmin.set(false);
      }
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
   this.reset();
  }
}
