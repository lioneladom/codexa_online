export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    return `http://${hostname}:3002`;
  }
  return 'http://localhost:3002';
};

export const getSocketUrl = (): string => {
  return getApiUrl();
};
