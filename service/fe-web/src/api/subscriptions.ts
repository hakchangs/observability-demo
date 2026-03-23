import { api } from './client';

export interface Subscription {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productType: string;
  startDate: string;
  endDate: string | null;
  status: string;
  monthlyPremium: number;
}

export const getSubscriptions = () => api.get<Subscription[]>('/api/subscriptions');
