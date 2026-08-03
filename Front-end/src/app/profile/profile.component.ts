import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { countries, Country } from './../shared/country-list';
import { UserModel } from './userModel';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    NgFor,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly profileNgForm = viewChild<NgForm>('profileNgForm');
  readonly lifeEnd$ = new Subject<boolean>();

  user: UserModel = new UserModel();
  inEdit = false;
  form!: FormGroup;
  editSuccess = false;
  updateErrors: string[] = [];
  errorMsg = '';
  imageFormats = '.jpg, .jpeg, .png, .tiff, .gif';
  previewPic = '';
  countries: Country[] = countries;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]{1,25}$')]],
      lastName: ['', [Validators.pattern('^[a-zA-Z ]{1,25}$')]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      profilePicture: [null],
      phoneNumber: ['', [Validators.minLength(10), Validators.maxLength(15), Validators.pattern('^[+]?[0-9]+$')]],
      addressLine1: ['', [Validators.maxLength(50)]],
      addressLine2: ['', [Validators.maxLength(50)]],
      country: ['', [Validators.maxLength(50)]],
      shortBio: ['', [Validators.maxLength(1000)]],
    });

    this.httpClient
      .get(`${environment.API_ROOT}/profile/getDetails`)
      .pipe(takeUntil(this.lifeEnd$))
      .subscribe((user: any) => {
        this.user = new UserModel();
        Object.keys(user).forEach((key) => {
          if (this.user.hasOwnProperty(key)) {
            this.user[key as keyof UserModel] = user[key];
            this.form.get(key)?.setValue(user[key] != null ? user[key] : '');
          }
        });
        this.previewPic = user.profilePicUrl || '';
      });
  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  onProfilePictureSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.form.get('profilePicture')?.setValue(file);
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataURL = reader.result;
      if (dataURL) {
        this.previewPic = dataURL.toString();
      }
    };
    reader.readAsDataURL(file);
  }

  update(): void {
    if (!this.form.valid) {
      return;
    }

    const formData = new FormData();
    Object.keys(this.form.value).forEach((key) => {
      const value = this.form.value[key];
      if (value !== '' && value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');
    this.httpClient
      .post(`${environment.API_ROOT}/profile/updateDetails`, formData, { headers })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError((errResp) => {
          this.editSuccess = false;
          if (errResp.error && Array.isArray(errResp.error)) {
            this.updateErrors = errResp.error;
          } else {
            this.errorMsg = 'Something went wrong while updating entries. Please try again later.';
          }
          return of(null);
        })
      )
      .subscribe((user: any) => {
        if (!user) {
          return;
        }
        this.inEdit = false;
        this.user = new UserModel();
        Object.keys(user).forEach((key) => {
          if (this.user.hasOwnProperty(key)) {
            this.user[key as keyof UserModel] = user[key];
            this.form.get(key)?.setValue(user[key] !== null ? user[key] : '');
          }
        });
        this.form.get('profilePicture')?.setValue(null);
      });
  }

  clear(): void {
    this.inEdit = false;
    this.updateErrors = [];
    this.errorMsg = '';
    this.form.get('profilePicture')?.setValue(null);
  }
}
