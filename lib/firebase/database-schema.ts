/**
 * This file defines the database schema for the application.
 * It's not used directly by Firebase but serves as documentation.
 */

export interface FirestoreSchema {
  users: Record<string, User>;
  links: Record<string, Link>;
  clicks: Array<Click>;
  earnings: Array<Earning>;
  blogPosts: Record<string, BlogPost>;
  settings: Record<string, Setting>;
  subscriptions: Record<string, Subscription>;
  payments: Array<Payment>;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL?: string | null;
  role: 'user' | 'admin' | 'superadmin';
  status: 'active' | 'suspended' | 'pending_verification' | 'banned';
  createdAt: Date;
  lastLoginAt: Date;
  updatedAt?: Date;
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'premium' | 'enterprise';
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'expired';
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEnd?: Date;
    customerId?: string;
    subscriptionId?: string;
  };
  profile?: {
    bio?: string;
    website?: string;
    company?: string;
    socialLinks?: {
      twitter?: string;
      facebook?: string;
      instagram?: string;
      linkedin?: string;
    };
    phoneNumber?: string;
  };
  settings: {
    emailNotifications: boolean;
    defaultRedirectDelay: number;
    paymentThreshold?: number;
    defaultAdSettings?: {
      enabled: boolean;
      preferredAdTypes: string[];
      blogTemplateId: string;
    };
    twoFactorEnabled?: boolean;
    ipWhitelisting?: boolean;
  };
  stats: {
    totalLinks: number;
    totalClicks: number;
    totalEarnings: number;
    balance: number;
    pendingPayment?: number;
  };
  finances?: {
    totalEarnings: number;
    availableBalance: number;
    pendingBalance: number;
    lifetimeClicks?: number;
    lifetimeUniqueVisitors?: number;
  };
  metadata?: {
    authCreatedAt: string;
    authLastLoginAt: string;
  };
  getIdToken?: () => Promise<string>;
  getIdTokenResult?: () => Promise<any>;
}

export interface LinkSettings {
  redirectDelay: number;
  password?: string;
  adEnabled: boolean;
  blogPages: number;
}

export interface LinkAnalytics {
  clicks: number;
  uniqueVisitors: number;
  earnings: number;
  lastClickedAt?: Date;
  bounceRate?: number;
  averageTimeOnPage?: number;
  conversionRate?: number;
  geoDistribution?: Record<string, number>;
  deviceDistribution?: Record<string, number>;
  referrerDistribution?: Record<string, number>;
  hourlyClickDistribution?: number[];
  dailyClickDistribution?: number[];
}

export interface Link {
  id: string;
  userId: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'inactive' | 'expired' | 'disabled';
  clicks: number;
  uniqueVisitors: number;
  settings: LinkSettings;
  analytics: LinkAnalytics;
  campaign?: string;
  tags?: string[];
  fraudProtection: {
    suspiciousClicks: number;
    blockedIPs: string[];
    lastFraudCheck: Date;
  };
  revenueShare: {
    publisherRate: number;
    platformRate: number;
  };
}

export interface Click {
  id: string;
  linkId: string;
  userId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  referer: string;
  country?: string;
  region?: string;
  city?: string;
  isUnique: boolean;
  device?: string;
  browser?: string;
  os?: string;
  sessionDuration?: number;
  adInteractions?: {
    impressions: number;
    clicks: number;
  };
  fraudScore?: number;
  earned?: number;
}

export interface Earning {
  id: string;
  userId: string;
  linkId: string;
  amount: number;
  source: 'ad' | 'referral' | 'subscription';
  timestamp: Date;
  status: 'pending' | 'paid';
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  author: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  featuredImage?: string;
  linkId?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Setting {
  key: string;
  value: any;
  updatedAt: Date;
  description: string;
  category: 'system' | 'payment' | 'ads' | 'email';
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'canceled' | 'expired';
  startedAt: Date;
  endsAt: Date;
  renewalDate?: Date;
  paymentMethod: {
    type: 'card' | 'paypal';
    lastFour?: string;
  };
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  method: 'paypal' | 'bank_transfer' | 'stripe' | 'crypto';
  createdAt: Date;
  completedAt?: Date;
  reference?: string;
  notes?: string;
} 