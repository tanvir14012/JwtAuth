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
    }
  ]
})
export class AppHttpModule { 

  constructor(
    @Optional() @SkipSelf() parentModule?: AppHttpModule
  ) {

    if(parentModule) {
      throw new Error("AppHttp module has already been loaded.");
    }
  }
}
