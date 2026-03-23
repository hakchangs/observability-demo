import { api } from './client';

export interface Product {
  id: number;
  name: string;
  type: string;
  description: string;
  monthlyPremium: number;
  coverage: string;
}

export const getProducts = () => api.get<Product[]>('/api/products');
export const getProduct = (id: number) => api.get<Product>(`/api/products/${id}`);
