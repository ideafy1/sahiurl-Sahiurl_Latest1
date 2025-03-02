import { firestore } from "@/lib/firebase/admin"

export async function getLinks(userId: string) {
  try {
    const snapshot = await firestore
      .collection('links')
      .where('userId', '==', userId)
      .get();
      
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching links:', error);
    throw new Error('Failed to fetch links. Please try again.');
  }
} 