export interface User {
  id: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type SignupCredentials = LoginCredentials;
