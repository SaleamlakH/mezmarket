export interface LoginCredentials {
  email: string;
  password: string;
}

export type SignupCredentials = LoginCredentials;

export type LoginFormValues = LoginCredentials;

export interface SignupFormValues extends SignupCredentials {
  confirmPassword: string;
}
