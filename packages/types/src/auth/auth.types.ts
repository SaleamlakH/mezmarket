export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  name: string;
}

export type LoginFormValues = LoginCredentials;

export interface SignupFormValues extends SignupCredentials {
  confirmPassword: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface NewPasswordFormValues {
  password: string;
  confirmPassword: string;
}
