"use client"

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User as FirebaseUser } from "firebase/auth" // Import Firebase User type
import { User } from "@/types/database"
import { auth, db } from '@/lib/firebase/config'
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, getFirestore } from 'firebase/firestore'
import { admin } from '@/lib/firebase/admin'
import type { UserInfo, DecodedIdToken } from "firebase-admin/auth"

// Extend your User type with Firebase auth methods
export interface AuthUser extends User {
  displayName: string;
  photoURL: string | undefined;
  getIdToken: () => Promise<string>
  getIdTokenResult: () => Promise<any>
  // Add other Firebase methods you might need
  stats?: {
    totalLinks: number
    totalClicks: number
    totalEarnings: number
    balance: number
  }
  finances?: {
    totalEarnings: number
    availableBalance: number
    pendingBalance: number
    lifetimeClicks: number
    lifetimeUniqueVisitors: number
    conversionRate: number
    lastPayoutDate?: Date
    preferredPaymentMethod?: 'bank_transfer' | 'upi' | 'paypal'
    paymentDetails?: {
      bankName?: string
      accountNumber?: string
      ifsc?: string
      upiId?: string
      paypalEmail?: string
    }
    taxInformation?: {
      panNumber?: string
      gstNumber?: string
      taxResidency?: string
    }
  }
  status: 'active' | 'suspended' | 'pending_verification' | 'banned'
  metadata: {
    authCreatedAt: string
    authLastLoginAt: string
  }
  phoneNumber?: string | null
  providerData: UserInfo[]
  subscription: {
    plan: 'free' | 'basic' | 'pro' | 'enterprise'
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
    currentPeriodEnd: Date
    cancelAtPeriodEnd: boolean
  }
}

// Define the AuthContext type
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Export the hook to use auth
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Export the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user doc from Firestore
          const userRef = doc(db, "users", firebaseUser.uid)
          const userSnap = await getDoc(userRef)
          
          // Initialize userData with Firebase user properties
          let userData: AuthUser;
          
          if (userSnap.exists()) {
            // Merge Firestore data with Firebase Auth user
            const dbUser = userSnap.data() as User;
            
            userData = {
              ...dbUser,
              uid: firebaseUser.uid,
              // Use name from database or fallback to displayName from auth
              name: dbUser.name || firebaseUser.displayName || "User",
              // This is for AuthUser compatibility
              displayName: dbUser.name || firebaseUser.displayName || "User",
              email: dbUser.email || firebaseUser.email || "",
              photoURL: dbUser.photoURL || firebaseUser.photoURL,
              // Add functions from firebase auth user
              getIdToken: async () => await firebaseUser.getIdToken(),
              getIdTokenResult: async () => await firebaseUser.getIdTokenResult(),
            }
          } else {
            // User document doesn't exist yet, use default values
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "User",
              displayName: firebaseUser.displayName || "User",
              photoURL: firebaseUser.photoURL,
              role: "user",
              createdAt: new Date(),
              lastLoginAt: new Date(),
              status: "active",
              subscription: {
                plan: "free" as const,
                status: "active" as const,
                currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                cancelAtPeriodEnd: false
              },
              metadata: {
                authCreatedAt: firebaseUser.metadata.creationTime || "",
                authLastLoginAt: firebaseUser.metadata.lastSignInTime || "",
              },
              stats: {
                totalLinks: 0,
                totalClicks: 0,
                totalEarnings: 0,
                balance: 0
              },
              getIdToken: async () => await firebaseUser.getIdToken(),
              getIdTokenResult: async () => await firebaseUser.getIdTokenResult(),
            }
            
            // Create user document in Firestore
            // This should be handled by a separate function, we're just setting the user state here
          }
          
          setUser(userData)
        } catch (error) {
          console.error("Error fetching user data:", error)
          // Set a minimal user object in case of errors
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "User",
            displayName: firebaseUser.displayName || "User",
            photoURL: firebaseUser.photoURL,
            role: "user",
            createdAt: new Date(),
            lastLoginAt: new Date(),
            status: "active",
            subscription: {
              plan: "free" as const,
              status: "active" as const,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              cancelAtPeriodEnd: false
            },
            getIdToken: async () => await firebaseUser.getIdToken(),
            getIdTokenResult: async () => await firebaseUser.getIdTokenResult(),
          } as AuthUser)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return
    } catch (error: any) {
      console.error("Sign in error:", error)
      throw error
    }
  }

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update the user's display name
      await updateProfile(userCredential.user, { displayName: name })
      
      // Create user document in Firestore
      const userData: Omit<User, 'uid'> = {
        email: userCredential.user.email || '',
        name: name,
        photoURL: userCredential.user.photoURL ?? undefined,
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        status: 'active',
        subscription: {
          plan: 'free' as const,
          status: 'active' as const,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          cancelAtPeriodEnd: false
        },
        metadata: {
          authCreatedAt: new Date().toISOString(),
          authLastLoginAt: new Date().toISOString()
        }
      }
      
      await setDoc(doc(db, 'users', userCredential.user.uid), userData)
      
      return
    } catch (error: any) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      const userCredential = await signInWithPopup(auth, provider)
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))
      
      if (!userDoc.exists()) {
        // Create new user document for Google sign-ins
        const userData: Omit<User, 'uid'> = {
          email: userCredential.user.email || '',
          name: userCredential.user.displayName || '',
          photoURL: userCredential.user.photoURL ?? undefined,
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          status: 'active',
          subscription: {
            plan: 'free' as const,
            status: 'active' as const,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            cancelAtPeriodEnd: false
          },
          metadata: {
            authCreatedAt: new Date().toISOString(),
            authLastLoginAt: new Date().toISOString()
          }
        }
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userData)
      } else {
        // Update last login time
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          lastLoginAt: new Date()
        }, { merge: true })
      }
      
      return
    } catch (error: any) {
      console.error("Google sign in error:", error)
      throw error
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      router.push('/login')
    } catch (error: any) {
      console.error("Sign out error:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Add this if you need a direct auth getter
export const getClientAuth = () => auth

export const getCurrentUser = () => auth.currentUser

async function fetchUserData(uid: string) {
    const db = getFirestore();
    const userDoc = doc(db, 'users', uid);
    const userSnapshot = await getDoc(userDoc);
    
    if (!userSnapshot.exists()) {
        throw new Error("User data not found");
    }
    return userSnapshot.data();
}

