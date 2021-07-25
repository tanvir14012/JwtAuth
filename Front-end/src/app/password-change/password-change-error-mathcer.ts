import { FormControl, FormGroupDirective, NgForm } from "@angular/forms";
import { ErrorStateMatcher } from "@angular/material/core";

export class PasswordChangeErrorMatcher implements ErrorStateMatcher{
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        const isSubmitted = form && form.submitted;
        return !!(form?.hasError('mismatch') || form?.hasError('oldNewSame') && (control?.dirty || control?.touched || isSubmitted));
    }

}