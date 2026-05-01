export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  provider?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}
