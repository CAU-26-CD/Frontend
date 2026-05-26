const USER_ID_STORAGE_KEY = 'userId';

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
