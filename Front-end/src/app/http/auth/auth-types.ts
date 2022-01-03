export enum SignInStatus
{
    Unauthenticated,
    Authenticated,
    SessionLocked
}

export enum UserType {
    Admin,
    Person
}


export interface AuthStatus
{
    userId?: number | null;
    userEmail?: string;
    userPhone?: string | null;
    signInStatus: SignInStatus;
    rememberMe?: boolean | null;
    userType?: UserType | null;
    roles?: string[] | null;
    claims?: string[] | null;
    sessionLockEnabled?: boolean | null;
    isSessionLocked?: boolean | null;
}