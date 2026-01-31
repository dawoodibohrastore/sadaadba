// Subscription Service - Mock implementation for Google Play Billing
// This will be replaced with actual RevenueCat/Google Play Billing integration

import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTION_KEY = 'subscription_status';

export interface SubscriptionInfo {
  isActive: boolean;
  productId: string | null;
  purchaseToken: string | null;
  expiresAt: string | null;
  plan: 'monthly' | 'yearly' | null;
  price: string;
}

export interface SubscriptionProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  period: 'monthly' | 'yearly';
}

// Available subscription products (will come from Google Play in production)
export const SUBSCRIPTION_PRODUCTS: SubscriptionProduct[] = [
  {
    id: 'sadaa_premium_monthly',
    title: 'Sadaa Premium Monthly',
    description: 'Access all premium instrumentals',
    price: '₹53',
    priceAmount: 53,
    currency: 'INR',
    period: 'monthly',
  },
  {
    id: 'sadaa_premium_yearly',
    title: 'Sadaa Premium Yearly',
    description: 'Access all premium instrumentals - Save 20%',
    price: '₹499',
    priceAmount: 499,
    currency: 'INR',
    period: 'yearly',
  },
];

// Initialize subscription service
export const initializeSubscriptions = async (): Promise<void> => {
  // In production, this would initialize RevenueCat or Google Play Billing
  console.log('Subscription service initialized (mock)');
};

// Get available products
export const getProducts = async (): Promise<SubscriptionProduct[]> => {
  // In production, this would fetch from Google Play
  return SUBSCRIPTION_PRODUCTS;
};

// Get current subscription status
export const getSubscriptionStatus = async (): Promise<SubscriptionInfo> => {
  try {
    const data = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
    if (data) {
      const subscription = JSON.parse(data);
      // Check if subscription has expired
      if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
        return {
          isActive: false,
          productId: null,
          purchaseToken: null,
          expiresAt: null,
          plan: null,
          price: '₹53/month',
        };
      }
      return subscription;
    }
  } catch (error) {
    console.error('Error getting subscription status:', error);
  }
  
  return {
    isActive: false,
    productId: null,
    purchaseToken: null,
    expiresAt: null,
    plan: null,
    price: '₹53/month',
  };
};

// Purchase subscription (mock)
export const purchaseSubscription = async (productId: string): Promise<boolean> => {
  try {
    const product = SUBSCRIPTION_PRODUCTS.find(p => p.id === productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // In production, this would trigger Google Play Billing flow
    // For now, we simulate a successful purchase
    
    const expiresAt = new Date();
    if (product.period === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    
    const subscription: SubscriptionInfo = {
      isActive: true,
      productId: product.id,
      purchaseToken: `mock_token_${Date.now()}`,
      expiresAt: expiresAt.toISOString(),
      plan: product.period,
      price: product.price,
    };
    
    await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
    
    return true;
  } catch (error) {
    console.error('Error purchasing subscription:', error);
    return false;
  }
};

// Restore purchases (mock)
export const restorePurchases = async (): Promise<boolean> => {
  try {
    // In production, this would query Google Play for previous purchases
    const status = await getSubscriptionStatus();
    return status.isActive;
  } catch (error) {
    console.error('Error restoring purchases:', error);
    return false;
  }
};

// Cancel subscription (mock - in production handled by Google Play)
export const cancelSubscription = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(SUBSCRIPTION_KEY);
    return true;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return false;
  }
};
