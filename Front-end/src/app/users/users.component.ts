import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { UserModel } from '../profile/userModel';
import { countries, Country } from '../shared/country-list';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgFor,
    NgIf,
    MatTableModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
})
export class UsersComponent implements OnInit, OnDestroy {
  readonly usersUpNgForm = viewChild<NgForm>('usersNgForm');
  readonly table = viewChild(MatTable<UserModel>);
  readonly lifeEnd$ = new Subject<boolean>();

  displayedColumns: string[] = [
    'profilePicUrl',
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'addressLine1',
    'addressLine2',
    'country',
    'shortBio',
    'action',
  ];
  users: UserModel[] = [];
  editMode = false;
  createMode = false;
  form!: FormGroup;
  createSuccess = false;
  editSuccess = false;
  updateErrors: string[] = [];
  createErrors: string[] = [];
  errorMsg = '';
  imageFormats = '.jpg, .jpeg, .png, .tiff, .gif';
  previewPic = '';
  countries: Country[] = countries;
  user: UserModel = new UserModel();
  selectedUserId = '';
  loading = true;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]{1,25}$')]],
      lastName: ['', [Validators.pattern('^[a-zA-Z ]{1,25}$')]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      profilePicture: [null],
      password: [''],
      phoneNumber: ['', [Validators.minLength(10), Validators.maxLength(15), Validators.pattern('^[+]?[0-9]+$')]],
      addressLine1: ['', [Validators.maxLength(50)]],
      addressLine2: ['', [Validators.maxLength(50)]],
      country: ['', [Validators.maxLength(50)]],
      shortBio: ['', [Validators.maxLength(1000)]],
    });

    this.httpClient
      .get(`${environment.API_ROOT}/profile/getAll`)
      .pipe(takeUntil(this.lifeEnd$))
      .subscribe((userList: any) => {
        this.users = userList;
        this.loading = false;
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

  editUser(id: string): void {
    this.editMode = true;
    this.selectedUserId = id;
    const selectedUser = this.users.find((u) => u.id === id);
    this.user = selectedUser ? selectedUser : new UserModel();

    Object.keys(this.user).forEach((key) => {
      this.form.get(key)?.setValue(this.user[key as keyof UserModel] ? this.user[key as keyof UserModel] : '');
    });
    this.form.get('profilePicture')?.setValue(null);
    this.previewPic = this.user.profilePicUrl;
  }

  createUser(): void {
    this.createMode = true;
    this.form.reset();
    this.form.get('profilePicture')?.setValue(null);
    this.previewPic = '';
  }

  create(): void {
    if (!this.form.valid) {
      return;
    }
    const formData = new FormData();
    Object.keys(this.form.value).forEach((key) => {
      const value = this.form.value[key];
      if (value) {
        formData.append(key, value);
      }
    });

    const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');
    this.httpClient
      .post(`${environment.API_ROOT}/profile/createUser`, formData, { headers })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError((errResp) => {
          this.createSuccess = false;
          if (errResp.error && Array.isArray(errResp.error)) {
            this.createErrors = errResp.error;
          } else {
            this.errorMsg = 'Something went wrong while creating the user. Please try again later.';
          }
          return of(null);
        })
      )
      .subscribe((user: any) => {
        if (!user) {
          return;
        }
        this.user = new UserModel();
        Object.keys(user).forEach((key) => {
          if (this.user.hasOwnProperty(key)) {
            this.user[key as keyof UserModel] = user[key];
          }
        });

        this.previewPic = this.user.profilePicUrl;
        this.users.push(this.user);
        this.createMode = false;
        this.form.reset();
        this.form.get('profilePicture')?.setValue(null);

        this.snackBar.open('The user has been created successfully', undefined, {
          duration: 2500,
        });
      });
  }

  update(): void {
    if (!this.selectedUserId) {
      this.editMode = false;
      return;
    }
    if (!this.form.valid) {
      return;
    }

    const formData = new FormData();
    formData.append('id', this.selectedUserId);
    Object.keys(this.form.value).forEach((key) => {
      const value = this.form.value[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');
    this.httpClient
      .post(`${environment.API_ROOT}/profile/updateDetailsByAdmin`, formData, { headers })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError((errResp) => {
          this.editSuccess = false;
          if (errResp.error && Array.isArray(errResp.error)) {
            this.updateErrors = errResp.error;
          } else {
            this.errorMsg = 'Something went wrong while updating the user. Please try again later.';
          }
          return of(null);
        })
      )
      .subscribe((user: any) => {
        if (!user) {
          return;
        }
        this.editMode = false;
        this.user = new UserModel();
        Object.keys(user).forEach((key) => {
          if (this.user.hasOwnProperty(key)) {
            this.user[key as keyof UserModel] = user[key];
            this.form.get(key)?.setValue(user[key] != null ? user[key] : '');
          }
        });

        const index = this.users.findIndex((u) => u.id === this.user.id);
        if (index !== -1) {
          this.users[index] = this.user;
        }

        this.form.get('profilePicture')?.setValue(null);
        this.snackBar.open('User information updated successfully', undefined, {
          duration: 2500,
        });
      });
  }

  deleteUser(id: string): void {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return;
    }
    this.dialog
      .open(ConfirmationDialogComponent, {
        data: {
          heading: 'Confirm Delete Action',
          message: `The user ${user.firstName} ${user.lastName} will be deleted permanently. The action can not be undone.`,
          headingCssClass: 'text-danger',
          messageCssClass: 'text-secondary',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.httpClient
          .delete(`${environment.API_ROOT}/profile/deleteUser/${id}`)
          .pipe(takeUntil(this.lifeEnd$))
          .subscribe((success) => {
            if (success) {
              const index = this.users.findIndex((u) => u.id === id);
              this.users.splice(index, 1);
              this.table()?.renderRows();
              this.snackBar.open('The user has been deleted successfully.', undefined, {
                duration: 2500,
              });
            } else {
              this.snackBar.open('An error occurred while deleting the user. Please try again.', undefined, {
                duration: 2500,
              });
            }
          });
      });
  }

  clear(): void {
    this.createMode = false;
    this.editMode = false;
    this.createErrors = [];
    this.updateErrors = [];
    this.errorMsg = '';
    this.form.get('profilePicture')?.setValue(null);
  }
}
