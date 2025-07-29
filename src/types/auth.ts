export interface UserProfile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  api_usage_count: number;
  api_usage_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionLimits {
  daily_requests: number;
  features: string[];
  storage_gb: number;
  priority_support: boolean;
}

export const subscriptionLimits: Record<string, SubscriptionLimits> = {
  free: {
    daily_requests: 10,
    features: ['basic_analysis', 'object_detection'],
    storage_gb: 1,
    priority_support: false,
  },
  premium: {
    daily_requests: 100,
    features: ['basic_analysis', 'object_detection', 'segmentation', 'analytics'],
    storage_gb: 10,
    priority_support: true,
  },
  enterprise: {
    daily_requests: 1000,
    features: ['basic_analysis', 'object_detection', 'segmentation', 'analytics', 'custom_models'],
    storage_gb: 100,
    priority_support: true,
  },
}; 