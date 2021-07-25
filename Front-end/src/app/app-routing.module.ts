import { AdminGuard } from './http/auth/admin-guard';
import { PublicOnlyGuard } from './http/auth/public-only-guard';
import { AuthGuard } from './http/auth/auth-guard';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [

  {
    path: "",
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      { path: "", loadChildren: () => import("src/app/home/home.module").then(m => m.HomeModule)},
      { path: "home", loadChildren: () => import("src/app/home/home.module").then(m => m.HomeModule)},
      { path: "profile", loadChildren: () => import("src/app/profile/profile.module").then(m => m.ProfileModule)},
      { path: "change-password", loadChildren: () => import("src/app/password-change/password-change.module").then(m => m.PasswordChangeModule)},
      { path: "reset-password", loadChildren: () => import("src/app/password-reset/password-reset.module").then(m => m.PasswordResetModule)}
    ]
  },

  {
    path: "",
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    children: [
      { path: "users", loadChildren: () => import("src/app/users/users.module").then(m => m.UsersModule)}
    ]
  },

  {
    path: "",
    canActivate: [PublicOnlyGuard],
    canActivateChild: [PublicOnlyGuard],
    children: [
      { path: "", loadChildren: () => import("src/app/sign-up/sign-up.module").then(m => m.SignUpModule)},
      { path: "sign-up", loadChildren: () => import("src/app/sign-up/sign-up.module").then(m => m.SignUpModule)},
      { path: "sign-in", loadChildren: () => import("src/app/sign-in/sign-in.module").then(m => m.SignInModule)}
    ]
  },

  {
    path: "",
    children: [
      { path: "not-found", loadChildren: () => import("src/app/not-found/not-found.module").then(m => m.NotFoundModule)},
      { path: "no-connection", loadChildren: () => import("src/app/no-connection/no-connection.module").then(m => m.NoConnectionModule)},
      { path: "**", redirectTo: "not-found"},
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
