const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const userId = localStorage.getItem('userId');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(userId && { 'x-user-id': userId }),
      ...options.headers,
    },
  });
  
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
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthUser>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    signup: (email: string, password: string, name: string) =>
      request<AuthUser>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }),
    social: (provider: 'google' | 'apple', providerId: string, email: string, name?: string, avatarUrl?: string) =>
      request<AuthUser>('/auth/social', {
        method: 'POST',
        body: JSON.stringify({ provider, providerId, email, name, avatarUrl }),
      }),
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
