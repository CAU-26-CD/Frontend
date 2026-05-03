import axios from 'axios';

export const instance = axios.create({
  baseURL: import.meta.env.BASE_URL,
  withCredentials: true,
});

// 요청 인터셉터
instance.interceptors.request.use((config) => {
  // 토큰 넣기 가능
  return config;
});

// 응답 인터셉터
instance.interceptors.response.use(
  (res) => res,
  (err) => {
    // 에러 처리 (401 등)
    return Promise.reject(err);
  },
);
