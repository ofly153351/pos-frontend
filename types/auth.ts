export type ApiResponse<T> = {
  data?: T;
  error?: unknown;
  message: string;
  success: boolean;
};

export type AuthUser = {
  created_at: string;
  email: string;
  id: string;
  name: string;
  role?: string;
  status?: string;
};

export type AuthPayload = {
  access_token: string;
  store_id?: string;
  token_type: string;
  user: AuthUser;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  name: string;
  password: string;
};
