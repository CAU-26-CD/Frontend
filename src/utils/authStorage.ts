const USER_ID_STORAGE_KEY = 'userId';
const USER_EMAIL_STORAGE_KEY = 'userEmail';
const ACCESS_TOKEN_STORAGE_KEY = 'accessToken';

export const saveStoredUserId = (userId: number) => {
  localStorage.setItem(USER_ID_STORAGE_KEY, String(userId));
};

export const getStoredUserId = () => {
  const storedUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
  const userId = Number(storedUserId);

  return Number.isFinite(userId) && userId > 0 ? userId : null;
};

export const clearStoredUserId = () => {
  localStorage.removeItem(USER_ID_STORAGE_KEY);
};

export const clearStoredAuth = () => {
  localStorage.removeItem(USER_ID_STORAGE_KEY);
  localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
};
