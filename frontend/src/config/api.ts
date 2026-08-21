export const getApiUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:3002`;
    }
  }
  // Default live cloud backend on Render
  return 'https://eii-g5vr.onrender.com';
};

export const getSocketUrl = (): string => {
  return getApiUrl();
};
