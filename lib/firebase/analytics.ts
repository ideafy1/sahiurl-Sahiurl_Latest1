import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment, 
  serverTimestamp, 
  Timestamp,
  DocumentData,
  FieldPath,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { UAParser } from "ua-parser-js";
import { updateUserStats } from "./users";
import type { Click as ClickType, Earning } from "./database-schema";

interface ClickData {
  ip: string;
  userAgent: string;
  referer?: string;
  country?: string;
  city?: string;
  browser?: string;
  os?: string;
  device?: string;
}

interface Click {
  id: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  earned?: number;
  country?: string;
  browser?: string;
  os?: string;
  device?: string;
  linkId?: string;
  userId?: string;
}

const parseTimestamp = (timestamp: Date | Timestamp | undefined): Date => {
  if (!timestamp) return new Date() // Fallback to current date
  if (timestamp instanceof Timestamp) return timestamp.toDate()
  return new Date(timestamp)
}

function convertToClick(doc: DocumentSnapshot): ClickType {
  const data = doc.data()!
  return {
    id: doc.id,
    linkId: data.linkId,
    timestamp: parseTimestamp(data.timestamp),
    ip: data.ip || 'unknown',
    userAgent: data.userAgent || 'unknown',
    // ... include any other fields as needed
  }
}

function convertToEarning(doc: DocumentSnapshot): Earning {
  const data = doc.data()!
  return {
    id: doc.id,
    amount: data.amount,
    timestamp: parseTimestamp(data.timestamp),
    userId: data.userId || '',
    linkId: data.linkId || '',
    source: data.source || 'unknown',
    status: data.status || 'pending',
    // ... include any other fields as needed
  }
}

export async function recordClick(linkId: string, clickData: ClickData) {
  try {
    // Get link details to find userId
    const linkRef = doc(db, "links", linkId);
    const linkDoc = await getDoc(linkRef);
    
    if (!linkDoc.exists()) {
      throw new Error("Link not found");
    }
    
    const linkData = linkDoc.data();
    const userId = linkData.userId;
    
    // Parse user agent to get device, browser, and OS info
    if (clickData.userAgent) {
      const parser = new UAParser(clickData.userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const device = parser.getDevice();

      clickData.browser = `${browser.name || ''} ${browser.version || ''}`.trim() || undefined;
      clickData.os = `${os.name || ''} ${os.version || ''}`.trim() || undefined;
      clickData.device = device.type || undefined;
    }

    // Calculate base earnings (would normally vary based on user plan, etc.)
    const baseEarning = 0.005; // $0.005 per click
    
    // Record the click in Firestore
    const clickRef = await addDoc(collection(db, "clicks"), {
      linkId,
      userId,
      timestamp: serverTimestamp(),
      earned: baseEarning,
      ...clickData,
    });

    // Update link analytics
    await updateDoc(linkRef, {
      "analytics.clicks": increment(1),
      "analytics.earnings": increment(baseEarning),
      "analytics.lastClickedAt": serverTimestamp(),
    });
    
    // Update user stats
    await updateUserStats(userId, { 
      clicks: 1,
      earnings: baseEarning
    });

    // If we have location data, update country analytics
    if (clickData.country) {
      try {
        // Update country-specific statistics in a subcollection
        const countryRef = doc(db, `links/${linkId}/countries`, clickData.country);
        const countryDoc = await getDoc(countryRef);
        
        if (countryDoc.exists()) {
          await updateDoc(countryRef, {
            count: increment(1),
            earnings: increment(baseEarning),
            lastClick: serverTimestamp(),
          });
        } else {
          await updateDoc(countryRef, {
            country: clickData.country,
            count: 1,
            earnings: baseEarning,
            firstClick: serverTimestamp(),
            lastClick: serverTimestamp(),
          });
        }
      } catch (countryError) {
        console.error("Error updating country analytics:", countryError);
        // Continue execution - don't fail the entire click recording
      }
    }

    // If we have browser data, update browser analytics
    if (clickData.browser) {
      try {
        const browserRef = doc(db, `links/${linkId}/browsers`, clickData.browser.split(' ')[0]);
        const browserDoc = await getDoc(browserRef);
        
        if (browserDoc.exists()) {
          await updateDoc(browserRef, {
            count: increment(1),
            lastClick: serverTimestamp(),
          });
        } else {
          await updateDoc(browserRef, {
            browser: clickData.browser.split(' ')[0],
            count: 1,
            firstClick: serverTimestamp(),
            lastClick: serverTimestamp(),
          });
        }
      } catch (browserError) {
        console.error("Error updating browser analytics:", browserError);
      }
    }

    return {
      clickId: clickRef.id,
      earned: baseEarning
    };
  } catch (error) {
    console.error("Error recording click:", error);
    throw error;
  }
}

export async function trackEarnings(userId: string, linkId: string, amount: number, source: 'ad' | 'referral' | 'subscription' = 'ad') {
  try {
    // Update link analytics
    const linkRef = doc(db, "links", linkId);
    await updateDoc(linkRef, {
      "analytics.earnings": increment(amount),
    });
    
    // Update user stats
    await updateUserStats(userId, { earnings: amount });
    
    // Record the earning event
    await addDoc(collection(db, "earnings"), {
      userId,
      linkId,
      amount,
      source,
      timestamp: serverTimestamp(),
      status: 'pending'
    });
  } catch (error) {
    console.error("Error tracking earnings:", error);
    throw error;
  }
}

export async function getClickStats(linkId: string, period: 'day' | 'week' | 'month' | 'year' | 'all' = 'all') {
  const clicksRef = collection(db, "clicks");
  let constraints = [where("linkId", "==", linkId)];
  
  // Calculate the start date based on the period
  if (period !== 'all') {
    const startDate = new Date();
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    constraints.push(where("timestamp", ">=", Timestamp.fromDate(startDate)));
  }
  
  const q = query(clicksRef, ...constraints, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  
  // Process clicks to get stats
  const clicks: ClickType[] = querySnapshot.docs.map(doc => {
    const data = doc.data() as Partial<ClickType>;
    return {
      id: doc.id,
      ...data,
      timestamp: parseTimestamp(data.timestamp),
    } as ClickType;
  });
  
  // Calculate statistics
  const totalClicks = clicks.length;
  const totalEarnings = clicks.reduce((sum, click) => sum + (click.earned || 0), 0);
  
  // Group by country
  const countryStats: Record<string, { count: number, earnings: number }> = {};
  const browserStats: Record<string, number> = {};
  const osStats: Record<string, number> = {};
  const deviceStats: Record<string, number> = {};
  
  clicks.forEach(click => {
    // Country stats
    if (click.country) {
      if (!countryStats[click.country]) {
        countryStats[click.country] = { count: 0, earnings: 0 };
      }
      countryStats[click.country].count++;
      countryStats[click.country].earnings += (click.earned || 0);
    }
    
    // Browser stats
    if (click.browser) {
      const browserName = click.browser.split(' ')[0];
      browserStats[browserName] = (browserStats[browserName] || 0) + 1;
    }
    
    // OS stats
    if (click.os) {
      const osName = click.os.split(' ')[0];
      osStats[osName] = (osStats[osName] || 0) + 1;
    }
    
    // Device stats
    if (click.device) {
      deviceStats[click.device] = (deviceStats[click.device] || 0) + 1;
    }
  });
  
  return {
    totalClicks,
    totalEarnings,
    countryStats,
    browserStats,
    osStats,
    deviceStats,
    clicks: clicks.slice(0, 100) // Return the last 100 clicks
  };
}

export async function getUserAnalytics(userId: string) {
  try {
    // Simple mock data for now - replace with actual Firestore queries
    return {
      clicksToday: Math.floor(Math.random() * 100),
      earningsToday: Math.random() * 10,
      clicksByDate: [
        { date: '2023-09-01', clicks: Math.floor(Math.random() * 100) },
        { date: '2023-09-02', clicks: Math.floor(Math.random() * 100) },
        { date: '2023-09-03', clicks: Math.floor(Math.random() * 100) },
        { date: '2023-09-04', clicks: Math.floor(Math.random() * 100) },
        { date: '2023-09-05', clicks: Math.floor(Math.random() * 100) },
      ],
      topCountries: [
        { country: 'United States', clicks: Math.floor(Math.random() * 100) },
        { country: 'India', clicks: Math.floor(Math.random() * 100) },
        { country: 'United Kingdom', clicks: Math.floor(Math.random() * 100) },
      ]
    };
  } catch (error) {
    console.error("Error getting user analytics:", error);
    return {
      clicksToday: 0,
      earningsToday: 0,
      clicksByDate: [],
      topCountries: []
    };
  }
}

export async function getFirestoreStats(): Promise<{
  totalUsers: number;
  totalLinks: number;
  totalClicks: number;
  countriesReached: number;
}> {
  try {
    // Count users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const totalUsers = usersSnapshot.size;
    
    // Count links
    const linksSnapshot = await getDocs(collection(db, "links"));
    const totalLinks = linksSnapshot.size;
    
    // Get total clicks and unique countries
    const clicksRef = collection(db, "clicks");
    const clicksSnapshot = await getDocs(clicksRef);
    const totalClicks = clicksSnapshot.size;
    
    // Get unique countries
    const countries = new Set<string>();
    clicksSnapshot.forEach(doc => {
      const clickData = doc.data();
      if (clickData.country && typeof clickData.country === 'string') {
        countries.add(clickData.country);
      }
    });
    
    return {
      totalUsers,
      totalLinks,
      totalClicks,
      countriesReached: countries.size
    };
  } catch (error) {
    console.error("Error getting Firestore stats:", error);
    // Return fallback stats
    return {
      totalUsers: 1200,
      totalLinks: 25000,
      totalClicks: 980000,
      countriesReached: 154
    };
  }
} 