const API_BASE = '/api';

// Token management
let authToken: string | null = localStorage.getItem('authToken');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuth() {
  authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (response.status === 401) {
    // Token expired or invalid - clear auth state
    clearAuth();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  authProvider?: string;
  avatarUrl?: string;
  token?: string;
}

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<AuthUser> => {
      const response = await request<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.token) {
        setAuthToken(response.token);
      }
      return response;
    },
    signup: async (email: string, password: string, confirmPassword: string, name: string): Promise<AuthUser> => {
      const response = await request<AuthUser>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, confirmPassword, name }),
      });
      if (response.token) {
        setAuthToken(response.token);
      }
      return response;
    },
    changePassword: async (currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> => {
      return request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
    },
    forgotPassword: async (email: string): Promise<{ message: string; resetLink?: string }> => {
      return request<{ message: string; resetLink?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
    resetPassword: async (token: string, newPassword: string, confirmNewPassword: string): Promise<{ message: string }> => {
      return request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword, confirmNewPassword }),
      });
    },
    social: async (provider: 'google' | 'apple', idToken: string): Promise<AuthUser> => {
      const response = await request<AuthUser>('/auth/social', {
        method: 'POST',
        body: JSON.stringify({ provider, idToken }),
      });
      if (response.token) {
        setAuthToken(response.token);
      }
      return response;
    },
    logout: () => {
      clearAuth();
    },
  },
  
  grinders: {
    list: () => request<any[]>('/grinders'),
    create: (data: any) => request<any>('/grinders', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/grinders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/grinders/${id}`, { method: 'DELETE' }),
  },
  
  brewers: {
    list: () => request<any[]>('/brewers'),
    create: (data: any) => request<any>('/brewers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/brewers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/brewers/${id}`, { method: 'DELETE' }),
  },
  
  recipes: {
    list: () => request<any[]>('/recipes'),
    create: (data: any) => request<any>('/recipes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/recipes/${id}`, { method: 'DELETE' }),
    toggleFavorite: (id: string) => request<any>(`/recipes/${id}/favorite`, { method: 'PATCH' }),
  },
  
  coffeeBeans: {
    list: () => request<any[]>('/coffee-beans'),
    create: (data: any) => request<any>('/coffee-beans', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/coffee-beans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/coffee-beans/${id}`, { method: 'DELETE' }),
    toggleFavorite: (id: string) => request<any>(`/coffee-beans/${id}/favorite`, { method: 'PATCH' }),
  },
  
  brews: {
    list: () => request<any[]>('/brews'),
    create: (data: any) => request<any>('/brews', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/brews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/brews/${id}`, { method: 'DELETE' }),
    toggleFavorite: (id: string) => request<any>(`/brews/${id}/favorite`, { method: 'PATCH' }),
  },
  
  brewTemplates: {
    list: () => request<any[]>('/brew-templates'),
    create: (data: any) => request<any>('/brew-templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/brew-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/brew-templates/${id}`, { method: 'DELETE' }),
  },
  
  coffeeServers: {
    list: () => request<any[]>('/coffee-servers'),
    create: (data: any) => request<any>('/coffee-servers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/coffee-servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/coffee-servers/${id}`, { method: 'DELETE' }),
  },
  
  uploads: {
    upload: async (file: Blob): Promise<{ url: string; filename: string }> => {
      const formData = new FormData();
      formData.append('image', file);
      
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    delete: (filename: string) => request<any>(`/uploads/${filename}`, { method: 'DELETE' }),
  },
  
  ai: {
    analyzeCoffeeBag: (images: string[]) =>
      request<{
        name: string;
        roaster: string;
        country: string;
        region: string;
        altitude: string;
        varietal: string;
        process: string;
        roastLevel: string;
        roastFor: string;
        tastingNotes: string;
        url: string;
        roastDate: string;
        weight: number;
      }>('/ai/analyze-coffee-bag', {
        method: 'POST',
        body: JSON.stringify({ images }),
      }),
  },
};
