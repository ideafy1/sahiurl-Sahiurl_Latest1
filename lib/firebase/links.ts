import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  increment,
  QueryConstraint,
  DocumentSnapshot,
  DocumentData,
  limit as firestoreLimit,
  OrderByDirection,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import type { Link as LinkType } from "@/types/database"
import { nanoid } from "nanoid"
import { updateUserStats } from "./users"
import { generateShortCode, getFullShortUrl, BASE_URL } from '../utils/url'

interface LinkAnalytics {
  clicks: number
  uniqueVisitors: number
  countries: Record<string, number>
  referrerDistribution: Record<string, number>
  browsers: Record<string, number>
  deviceDistribution: Record<string, number>
  earnings: number
}

interface LinkSettings {
  redirectDelay: number
  password?: string
  adEnabled: boolean
  blogPages?: number
}

export interface Link {
  id: string
  userId: string
  originalUrl: string
  shortCode: string
  shortUrl: string
  title: string
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date
  status: 'active' | 'inactive' | 'disabled' | 'expired'
  settings: LinkSettings
  analytics: LinkAnalytics
  campaign?: string
  tags?: string[]
  fraudProtection: {
    suspiciousClicks: number
    blockedIPs: string[]
    lastFraudCheck: Date
  }
  revenueShare: {
    publisherRate: number
    platformRate: number
  }
}

export interface GetUserLinksOptions {
  userId: string
  status?: "active" | "archived"
  search?: string
  orderBy?: "clicks" | "createdAt" | "lastClickedAt"
  orderDir?: "asc" | "desc"
  limit?: number
}

export async function createLink(
  userId: string,
  originalUrl: string,
  options: {
    title?: string
    customCode?: string
    expiresAt?: Date
    redirectDelay?: number
    password?: string
    campaign?: string
    blogPages?: number
    tags?: string[]
  } = {},
): Promise<LinkType> {
  try {
    // Generate or use custom short code
    let shortCode = options.customCode
    let attempts = 0
    const maxAttempts = 3

    // If no custom code provided or custom code is taken, generate a random one
    while (!shortCode || attempts < maxAttempts) {
      if (!shortCode) {
        shortCode = generateShortCode()
      }

      // Check if code exists
      const existingLink = await getLinkByShortCode(shortCode)
      if (!existingLink) break

      // If custom code was provided and exists, throw error
      if (options.customCode) {
        throw new Error("Custom code already exists")
      }

      // Reset for next attempt
      shortCode = undefined
      attempts++
    }

    if (!shortCode) {
      throw new Error("Failed to generate unique short code")
    }

    const link: Omit<LinkType, "id"> = {
      userId,
      originalUrl,
      shortCode,
      shortUrl: getFullShortUrl(shortCode),
      title: options.title || `Link to ${new URL(originalUrl).hostname}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: options.expiresAt,
      status: "active",
      clicks: 0,
      uniqueVisitors: 0,
      settings: {
        redirectDelay: options.redirectDelay || 10,
        password: options.password,
        adEnabled: true,
        blogPages: options.blogPages || 3,
      },
      analytics: {
        clicks: 0,
        uniqueVisitors: 0,
        earnings: 0,
        bounceRate: 0,
        averageTimeOnPage: 0,
        conversionRate: 0,
        geoDistribution: {},
        deviceDistribution: {},
        referrerDistribution: {},
        hourlyClickDistribution: new Array(24).fill(0),
        dailyClickDistribution: new Array(7).fill(0)
      },
      campaign: options.campaign,
      tags: options.tags,
      fraudProtection: {
        suspiciousClicks: 0,
        blockedIPs: [],
        lastFraudCheck: new Date()
      },
      revenueShare: {
        publisherRate: 70,
        platformRate: 30
      }
    }

    const docRef = await addDoc(collection(db, "links"), {
      ...link,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Update user stats
    await updateUserStats(userId, { links: 1 })

    return {
      id: docRef.id,
      ...link,
    }
  } catch (error: any) {
    console.error("Error creating link:", error)
    throw new Error(error.message || "Failed to create link")
  }
}

export async function getLinkByShortCode(shortCode: string): Promise<LinkType | null> {
  try {
    const q = query(collection(db, "links"), where("shortCode", "==", shortCode))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      return null
    }

    const doc = querySnapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data()
    } as LinkType
  } catch (error) {
    console.error("Error getting link:", error)
    return null
  }
}

export async function getUserLinks(
  userId: string | {
    userId: string;
    limit?: number;
    orderBy?: string;
    orderDir?: OrderByDirection;
    status?: 'active' | 'expired' | 'disabled';
  },
  options: {
    limit?: number;
    orderBy?: string;
    orderDir?: OrderByDirection;
    status?: 'active' | 'expired' | 'disabled';
  } = {}
): Promise<LinkType[]> {
  try {
    // Handle both string and object as first parameter
    let actualUserId: string;
    let actualOptions = options;
    
    if (typeof userId === 'object') {
      actualUserId = userId.userId;
      actualOptions = {
        limit: userId.limit,
        orderBy: userId.orderBy,
        orderDir: userId.orderDir,
        status: userId.status,
        ...actualOptions
      };
    } else {
      actualUserId = userId;
    }
    
    const { limit: limitCount = 100, orderBy: orderByField = 'createdAt', orderDir = 'desc', status } = actualOptions;
    
    const linksRef = collection(db, 'links');
    let q = query(
      linksRef, 
      where('userId', '==', actualUserId),
      orderBy(orderByField, orderDir),
      firestoreLimit(limitCount)
    );
    
    // Add status filter if provided
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    const querySnapshot = await getDocs(q);
    const links: LinkType[] = [];
    
    querySnapshot.forEach((doc) => {
      links.push(convertToLink(doc));
    });
    
    return links;
  } catch (error) {
    console.error("Error getting user links:", error);
    return [];
  }
}

export async function updateLink(id: string, updates: Partial<LinkType>): Promise<void> {
  const docRef = doc(db, "links", id)
  await updateDoc(docRef, updates)
}

export async function deleteLink(id: string): Promise<void> {
  const linkRef = doc(db, "links", id)
  await deleteDoc(linkRef)
}

export async function getLinkById(id: string): Promise<Link | null> {
  try {
    const docRef = doc(db, "links", id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return convertToLink(docSnap);
    }
    
    return null;
  } catch (error) {
    console.error("Error getting link by ID:", error);
    return null;
  }
}

export async function recordClick(linkId: string, clickData: {
  ip: string
  userAgent: string
  referer?: string
  country?: string
  device?: string
  browser?: string
}) {
  try {
    const linkRef = doc(db, "links", linkId)
    const linkDoc = await getDoc(linkRef)
    
    if (!linkDoc.exists()) {
      throw new Error("Link not found")
    }

    // Update analytics with proper field references
    await updateDoc(linkRef, {
      "analytics.clicks": increment(1),
      "analytics.uniqueVisitors": increment(1),
      [`analytics.geoDistribution.${clickData.country || 'unknown'}`]: increment(1),
      [`analytics.referrerDistribution.${clickData.referer || 'direct'}`]: increment(1),
      [`analytics.deviceDistribution.${clickData.device || 'unknown'}`]: increment(1),
      "analytics.lastClickedAt": serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Record click in separate collection for detailed analytics
    await addDoc(collection(db, "clicks"), {
      linkId,
      ...clickData,
      timestamp: serverTimestamp(),
      isUnique: true, // You might need a more sophisticated check for uniqueness
    })

  } catch (error) {
    console.error("Error recording click:", error)
    throw error
  }
}

export async function getAllShortCodes(): Promise<string[]> {
  try {
    const linksRef = collection(db, "links");
    const querySnapshot = await getDocs(linksRef);
    const shortCodes: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const link = doc.data();
      shortCodes.push(link.shortCode);
    });
    
    return shortCodes;
  } catch (error) {
    console.error("Error getting all short codes:", error);
    return [];
  }
}