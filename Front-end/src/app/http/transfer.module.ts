import { ErrorInterceptor } from './error-interceptor';
import { RequestInterceptor } from './request-interceptor';
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthService } from './auth/auth-service';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  providers:[
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: RequestInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    }
  ]
})
export class TransferModule { 

  constructor(
    @Optional() @SkipSelf() parentModule?: TransferModule
  ) {

    if(parentModule) {
      throw new Error("Transfer module has already been loaded.");
    }
  }
}
