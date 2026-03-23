import { api } from './client';

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
}

export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/api/auth/login', { username, password });

export const logout = () => api.post<void>('/api/auth/logout', {});
