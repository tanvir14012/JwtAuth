export class UserModel {
    constructor(
        public id: string = '',
        public firstName: string = '',
        public lastName: string = '',
        public email: string = '',
        public password: string = '',
        public phoneNumber:string = '',
        public addressLine1: string = '',
        public addressLine2: string = '',
        public profilePicUrl: string = '',
        public country: string = '',
        public shortBio: string = ''
    ) {

    }
}