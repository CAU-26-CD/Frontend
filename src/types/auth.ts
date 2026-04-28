// 임의로 일단 설정: 백엔드 요청 다르면 그때 수정
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken?: string;
}
