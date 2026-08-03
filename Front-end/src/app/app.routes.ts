import { Routes } from '@angular/router';

import { AdminGuard } from './http/auth/admin-guard';
import { AuthGuard } from './http/auth/auth-guard';
import { PublicOnlyGuard } from './http/auth/public-only-guard';
import { SessionLockGuard } from './http/auth/session-lock-guard';

export const appRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: 'home', loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent) },
      { path: 'profile', loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent) },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./password-change/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./password-reset/reset-password/reset-password.component').then((m) => m.ResetPasswordComponent),
      },
      {
        path: 'users',
        canActivate: [AdminGuard],
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
    ],
  },
  {
    path: '',
    canActivate: [PublicOnlyGuard],
    canActivateChild: [PublicOnlyGuard],
    children: [
      { path: 'sign-in', loadComponent: () => import('./sign-in/sign-in.component').then((m) => m.SignInComponent) },
      { path: 'sign-up', loadComponent: () => import('./sign-up/sign-up.component').then((m) => m.SignUpComponent) },
    ],
  },
  {
    path: '',
    children: [
      {
        path: 'unlock-session',
        canActivate: [SessionLockGuard],
        loadComponent: () => import('./unlock-session/unlock-session.component').then((m) => m.AuthUnlockSessionComponent),
      },
      {
        path: 'not-found',
        loadComponent: () => import('./not-found/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
      {
        path: 'no-connection',
        loadComponent: () => import('./no-connection/no-connection.component').then((m) => m.NoConnectionComponent),
      },
      { path: '**', redirectTo: 'not-found' },
    ],
  },
];
