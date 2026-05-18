import { instance } from './axios';
import type { LoginRequest, LoginResponse, User } from '../types/auth';

export const postLogin = async (data: LoginRequest): Promise<LoginResponse> => {
  const res = await instance.post('/api/v1/auth/login', data);
  return res.data;
};

export const getMe = async (): Promise<User> => {
  const res = await instance.get('/auth/me');
  return res.data;
};

export const postLogout = async (): Promise<void> => {
  await instance.post('/auth/logout');
};
