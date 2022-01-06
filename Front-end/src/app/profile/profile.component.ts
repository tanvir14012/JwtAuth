import { countries, Country } from './../shared/country-list';
import { Router } from '@angular/router';
import { UserModel } from './userModel';
import { AuthService } from './../http/auth/auth-service';
import { of, pipe, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { environment } from 'src/environments/environment';
import { catchError, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  @ViewChild('profileNgForm') profileNgForm: NgForm;
  isAdmin: boolean = false;
  lifeEnd$: Subject<any> = new Subject();
  user: UserModel = new UserModel();
  inEdit: boolean = false;
  form: FormGroup;
  editSuccess: boolean = false;
  updateErrors: any[] = [];
  errorMsg: string = '';
  imageFormats: string = ".jpg, .jpeg, .png, .tiff, .gif";
  previewPic: string = '';
  countries: Country[] = countries;

  constructor(
    private authService: AuthService,
    private httpClient: HttpClient,
    private router: Router,
    private fb: FormBuilder
    ) 
  { 
    
  }

  ngOnInit(): void {

    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      lastName: ['', [Validators.pattern("^[a-zA-Z ]{1,25}$")]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
      profilePicture: [''],
      phoneNumber: ['', [Validators.minLength(10), Validators.maxLength(15), Validators.pattern("^[+]?[0-9]+$")]],
      addressLine1: ['', [Validators.maxLength(50)]],
      addressLine2: ['', [Validators.maxLength(50)]],
      country: ['', [Validators.maxLength(50)]],
      shortBio: ['', [Validators.maxLength(1000)]]
    });

    /**
     * Populates user
     */
    this.httpClient.get(`${environment.API_ROOT}/profile/getDetails`)
      .pipe(
        takeUntil(this.lifeEnd$)
      ).subscribe((user:any) => {
        this.user = new UserModel();
        Object.keys(user).forEach(key => {
          if(this.user.hasOwnProperty(key)) {
            this.user[key as keyof UserModel] = user[key];
            this.form.get(key)?.setValue(user[key] != null ? user[key]: '');
          }
        });
        this.previewPic = user.profilePicUrl;
      });

      /**
       * Preview profile pic
       */
      this.form.get("profilePicture")?.valueChanges
        .pipe(
          distinctUntilChanged()
        ).subscribe(value => {
          let reader = new FileReader();
          reader.onload = e => {
            let dataURL = reader.result;
            if(dataURL) {
              this.previewPic = dataURL.toString();
            }
          };
          reader.readAsDataURL(value);
        });
      
  }

  ngOnDestroy(): void {
    this.lifeEnd$.next(true);
    this.lifeEnd$.complete();
  }

  update(): void {
    if(this.form.valid) {
      let formData = new FormData();
      for(var key in this.form.value) {
        if(this.form.value[key] !== '') {
          formData.append(key, this.form.value[key]);
        }
        
      }

      const headers = new HttpHeaders().append("Content-Disposition", "multipart/form-data");
      this.httpClient.post(
        `${environment.API_ROOT}/profile/updateDetails`, 
        formData,
        {
          headers: headers
        })
      .pipe(
        takeUntil(this.lifeEnd$),
        catchError(errResp => {
          this.editSuccess = false;
          if(errResp.error && Array.isArray(errResp.error)) {
            this.updateErrors = errResp.error;
          }
          else {
            this.errorMsg = "Something went wrong while updating entries. Please try again later.";
          }
          return of(null);
        })
      ).subscribe((user:any) => {
        if(user) {
          this.inEdit = false;
          this.user = new UserModel();
          Object.keys(user).forEach(key => {
            if(this.user.hasOwnProperty(key)) {
              this.user[key as keyof UserModel] = user[key];
              this.form.get(key)?.setValue(user[key] !== null ? user[key]: '');
            }
          });
        }
        
      });
    }
  }

  onCountrySelected($event: any) {
    this.form.get("country")?.setValue($event.name);
  }

  clear(): void {
    this.inEdit = false;
    this.updateErrors = [];
    this.errorMsg = "";
  }

}
