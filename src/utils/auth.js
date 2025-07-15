// 统一的认证工具函数

// 检查用户是否已登录
export const isAuthenticated = () => {
  return localStorage.getItem('access_token') !== null;
};

// 获取访问令牌
export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

// 获取用户信息
export const getUserInfo = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 清除认证信息
export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

// 统一的登录检查和跳转
export const checkAuthWithRedirect = () => {
  if (!isAuthenticated()) {
    alert('请先登录后再使用此功能');
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
    return false;
  }
  return true;
};

// 处理API错误，特别是401未授权错误
export const handleApiError = (error) => {
  if (error.response?.status === 401) {
    alert('登录已过期，请重新登录');
    clearAuth();
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }
  return error;
};

// 为axios请求添加认证头
export const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
