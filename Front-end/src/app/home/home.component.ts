import { Router } from '@angular/router';
import { AuthService } from './../http/auth/auth-service';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { of, Subject } from 'rxjs';
import { takeUntil, catchError, switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { bootstrap } from 'angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  lifeEnd$: Subject<boolean> = new Subject();

  constructor(
    private router: Router) 
  { 

  }

  ngOnInit(): void {


  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

}
