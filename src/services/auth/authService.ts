/**
 * Authentication Service
 * Handles all authentication operations: signup, login, logout, role management
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { User, UserRole } from '../../types/user';

/**
 * Sign up a new user with email and password
 * @param email User email
 * @param password User password
 * @param role User role (attendee or organizer)
 * @returns Promise with user data
 */
export async function signup(
  email: string,
  password: string,
  role: UserRole
): Promise<User> {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    // Create user document in Firestore
    const userData: User = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      role,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    return userData;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

/**
 * Login existing user
 * @param email User email
 * @param password User password
 * @returns Promise with user data
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

    // Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    return userDoc.data() as User;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Logout current user
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
 * Get current authenticated user
 * @returns Promise with user data or null
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
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          resolve(userDoc.data() as User);
        } else {
          resolve(null);
        }
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
