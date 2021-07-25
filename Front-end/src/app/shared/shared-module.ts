import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';


@NgModule({
    declarations: [
      ConfirmationDialogComponent
    ],
    imports: [
      CommonModule,
      MatButtonModule,
      MatDialogModule
    ],
    exports: [
      ConfirmationDialogComponent,
      MatDialogModule
    ]
  })
  export class SharedModule { }