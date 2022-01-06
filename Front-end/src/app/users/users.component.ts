import { ConfirmationData, ConfirmationDialogComponent } from './../shared/confirmation-dialog/confirmation-dialog.component';
import { AuthService } from './../http/auth/auth-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { catchError, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { countries, Country } from '../shared/country-list';
import { UserModel } from '../profile/userModel';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable } from '@angular/material/table';
import { of } from 'rxjs';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  @ViewChild('usersNgForm') usersUpNgForm: NgForm;
  @ViewChild(MatTable) table!: MatTable<UserModel>;
  displayedColumns:string[] = [ "profilePicUrl", "firstName", "lastName", "email", "phoneNumber", "addressLine1", 
   "addressLine2", "country", "shortBio", "action"];
  users: UserModel[] = [];
  lifeEnd$: Subject<any> = new Subject();
  editMode: boolean = false;
  createMode: boolean = false;
  form: FormGroup;
  createSuccess: boolean = false;
  editSuccess: boolean = false;
  updateErrors: string[] = [];
  createErrors: string[] = [];
  errorMsg: string = '';
  imageFormats: string = ".jpg, .jpeg, .png, .tiff, .gif";
  previewPic: string = '';
  countries: Country[] = countries;
  user: UserModel = new UserModel();
  selectedUserId: string = '';
  loading: boolean = true;

  constructor(
    private router: Router,
    private httpClient: HttpClient,
    private authService: AuthService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private changeDetectorRef: ChangeDetectorRef
  ) 
  { 
    
  }

  ngOnInit(): void {

    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      lastName: ['', [Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      profilePicture: [''],
      password: [''],
      phoneNumber: ['', [Validators.minLength(10), Validators.maxLength(15), 
        Validators.pattern("^[+]?[0-9]+$")]],
      addressLine1: ['', [Validators.maxLength(50)]],
      addressLine2: ['', [Validators.maxLength(50)]],
      country: ['', [Validators.maxLength(50)]],
      shortBio: ['', [Validators.maxLength(1000)]]
    });

    /**
     * Get the list of user
     */
    this.httpClient.get(`${environment.API_ROOT}/profile/getAll`)
        .pipe(
          takeUntil(this.lifeEnd$)
        ).subscribe((userList:any) => {
          this.users = userList;
          this.loading = false;
        });

    /**
       * Preview profile pic
       */
     this.form.get("profilePicture")?.valueChanges
     .pipe(
       takeUntil(this.lifeEnd$),
       distinctUntilChanged()
     ).subscribe(value => {
       if(value) {
        let reader = new FileReader();
        reader.onload = e => {
          let dataURL = reader.result;
          if(dataURL) {
            this.previewPic = dataURL.toString();
          }
        };
        reader.readAsDataURL(value);
       }
       
     });

  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  editUser(id: string): void {
    this.editMode = true;
    this.selectedUserId = id;
    let selectedUser = this.users.find(u => u.id === id);
    if(selectedUser) {
      this.user = selectedUser;
    }
    else {
      this.user = new UserModel();
    }

    Object.keys(this.user).forEach(key => {
        this.form.get(key)?.setValue(this.user[key as keyof UserModel] 
          ? this.user[key as keyof UserModel]: '');
    });
    this.previewPic = this.user.profilePicUrl;

  }

  createUser(): void {
    this.createMode = true;
    this.form.reset();
  }

  /**
   * Create a user
   */
  create(): void {

    if(this.form.valid) {
      let formData = new FormData();
      for(var key in this.form.value) {
        const value = this.form.value[key];
        if(value) {
          formData.append(key, this.form.value[key]);
        }
      }

      const headers = new HttpHeaders().append("Content-Disposition", "multipart/form-data");
      this.httpClient.post(
        `${environment.API_ROOT}/profile/createUser`, 
        formData,
        {
          headers: headers
        })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError(errResp => {
          this.createSuccess = false;
          if(errResp.error  && Array.isArray(errResp.error)) {
            this.createErrors = errResp.error;
          }
          else {
            this.errorMsg = "Something went wrong while creating the user. Please try again later.";
          }
          return of(null);
        })
      ).subscribe((user:any) => {
        
        if(user) 
        {
          this.user = new UserModel();
          Object.keys(user).forEach(key => {
            if(this.user.hasOwnProperty(key)) {
              this.user[key as keyof UserModel] = user[key];
            }
          });

          this.previewPic = this.user.profilePicUrl;
          this.users.push(this.user);
          this.createMode = false;
          this.form.reset();

          this.snackBar.open("The user has been created successfully", undefined, {
            duration: 2500
          } );
        }
      
        
      });
    }
  }

  /**
   * Update user profile information
   */
  update(): void {
    if(!this.selectedUserId) {
      this.editMode = false;
    }

    if(this.form.valid) {
      let formData = new FormData();
      formData.append("id", this.selectedUserId);
      for(var key in this.form.value) {
        formData.append(key, this.form.value[key]);
      }

      const headers = new HttpHeaders().append("Content-Disposition", "multipart/form-data");
      this.httpClient.post(
        `${environment.API_ROOT}/profile/updateDetailsByAdmin`, 
        formData,
        {
          headers: headers
        })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError(errResp => {
          this.editSuccess = false;
          if(errResp.error  && Array.isArray(errResp.error)) {
            this.updateErrors = errResp.error;
          }
          else {
            this.errorMsg = "Something went wrong while updating the user. Please try again later.";
          }
          return of(null);
        })
      ).subscribe((user:any) => {
        if(user) {
          this.editMode = false;
          this.user = new UserModel();
          Object.keys(user).forEach(key => {
            if(this.user.hasOwnProperty(key)) {
              this.user[key as keyof UserModel] = user[key];
              this.form.get(key)?.setValue(user[key] != null ? user[key]: '');
            }
          });
  
          let index = this.users.findIndex(u => u.id === this.user.id);
          if(index !== -1) {
            this.users[index] = this.user;
          }
  
          this.snackBar.open("User information updated successfully", undefined, {
            duration: 2500
          } );
        }
      });
    }
  }

  /**
   * Deletes a user
   * @param id: The user ID
   */
  deleteUser(id: string): void {
    let user = this.users.find(u => u.id === id);
    if(user) {
      this.dialog.open(ConfirmationDialogComponent, {
        data: {
          heading: "Confirm Delete Action",
          message: `The user ${user.firstName} ${user.lastName} will be deleted permanently. The action can not be undone.`,
          headingCssClass: "text-danger",
          messageCssClass: "text-secondary"
        }
      }).afterClosed().subscribe((confirmed) => {
          if(confirmed) {
            this.httpClient.delete(`${environment.API_ROOT}/profile/deleteUser/${id}`)
                .pipe(
                  takeUntil(this.lifeEnd$)
                ).subscribe(success => {
                  if(success) {
                    let index = this.users.findIndex(u => u.id === id);
                    this.users.splice(index, 1);
                    this.table.renderRows();
                    this.snackBar.open("The user has been deleted successfully.", undefined, {
                      duration: 2500
                    } );
                  }
                  else {
                    this.snackBar.open("An error occurred while deleting the user. Please try again.", undefined, {
                      duration: 2500
                    } );
                  }
                }) 
              
          }
      });
    }
  }

  clear(): void {
    this.createMode = false;
    this.editMode = false;
    this.createErrors = [];
    this.updateErrors = [];
    this.errorMsg = "";
  }

}
