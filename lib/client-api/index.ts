// This file contains client-side implementations of API functionality
import { auth } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Link } from '@/types/database';

// Replaces server API calls with client-side Firebase calls
export async function getLink(shortCode: string): Promise<Link> {
  try {
    const linksRef = collection(db, 'links');
    const q = query(linksRef, where('shortCode', '==', shortCode), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Link not found');
    }
    
    return {
      id: querySnapshot.docs[0].id,
      ...querySnapshot.docs[0].data()
    } as Link;
  } catch (error) {
    console.error("Error fetching link:", error);
    throw error;
  }
}

// Add more client-side API functions as needed 