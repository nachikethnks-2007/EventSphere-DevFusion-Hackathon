/**
 * Authentication Service
 * Handles all authentication operations: signup, login, logout, role management
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { User, UserRole } from '../../types/user';
import { COLLECTIONS } from '../../constants/collections';

/**
 * Sign up a new user with email and password
 * @param email User email
 * @param password User password
 * @param name User display name
 * @param role User role (attendee or organizer)
 * @returns Promise with user data
 */
export async function signup(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userData: User = {
      uid: firebaseUser.uid,
      name,
      email: firebaseUser.email!,
      role,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), userData);

    return userData;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

/**
 * Login existing user with email and password
 * Authenticates via Firebase Auth, then fetches the full user profile from Firestore
 * @param email User email
 * @param password User password
 * @returns Promise with authenticated user profile data
 */
export async function login(
  email: string,
  password: string
): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error(`User profile not found for uid: ${firebaseUser.uid}`);
    }

    return userDocSnap.data() as User;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Logout current user and clear Firebase session
 * @returns Promise<void>
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

/**
 * Get currently authenticated user with Firestore profile data
 * Listens for the current auth state once, then fetches the corresponding
 * user profile document from Firestore
 * @returns Promise with user profile data, or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();

      if (!firebaseUser) {
        resolve(null);
        return;
      }

      try {
        const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          resolve(null);
          return;
        }

        resolve(userDocSnap.data() as User);
      } catch (error) {
        console.error('Get current user error:', error);
        resolve(null);
      }
    });
  });
}

/**
 * Check if user has specific role
 * @param user User object
 * @param role Role to check
 * @returns Boolean
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  return user?.role === role;
}
