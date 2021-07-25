import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NoConnectionRoutingModule } from './no-connection-routing.module';
import { NoConnectionComponent } from './no-connection.component';


@NgModule({
  declarations: [
    NoConnectionComponent
  ],
  imports: [
    CommonModule,
    NoConnectionRoutingModule
  ]
})
export class NoConnectionModule { }
