import { Router } from '@angular/router';
import { AuthService } from './http/auth/auth-service';
import { Component } from '@angular/core';
import { of, Subject, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';
import { takeUntil, catchError, switchMap, distinctUntilChanged } from 'rxjs/operators';

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

  constructor(
    private router: Router,
    private authService: AuthService) {

  }

  ngOnInit(): void {

    /**
     * Checks if the user is authenticated
     */

    this.authService.check().pipe(
      takeUntil(this.lifeEnd$)
    ).subscribe();

    this.authService.isAuthenticated$.pipe(
      takeUntil(this.lifeEnd$),
      distinctUntilChanged())
      .subscribe((authenticated: boolean) => {
        this.isAuthenticated = authenticated;
      });

    /**
     * Checks admin role status
     *  */  
    this.authService.isAdmin$.pipe(
      takeUntil(this.lifeEnd$)
    ).subscribe(adminStatus => {
      this.isAdmin = adminStatus;
    });
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

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }
}
