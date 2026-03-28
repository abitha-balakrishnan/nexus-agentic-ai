import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isWorkflowBuilder: boolean;
  isOperator: boolean;
  isViewer: boolean;
  updateProfile: (data: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isWorkflowBuilder: false,
  isOperator: false,
  isViewer: false,
  updateProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true); // Reset loading to true to wait for profile
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        
        // Ensure profile exists
        getDoc(docRef).then((snap) => {
          if (!snap.exists()) {
            setDoc(docRef, {
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'viewer',
              createdAt: new Date().toISOString()
            }, { merge: true });
          }
        });

        unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const updateProfile = async (data: any) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    try {
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const isAdmin = profile?.role === 'admin' || 
                  (user?.email === 'sriramkrishnav4949@gmail.com') || 
                  (user?.email === 'supportfornexusai@gmail.com') ||
                  (user?.email === 'hereworksg9571@gmail.com') ||
                  (user?.email === 'rithyagayathri7@gmail.com') ||
                  (user?.uid === 'ffAMkkXfQdOrEnN8dSbd6aIeaZy2');

  const isWorkflowBuilder = profile?.role === 'workflow_builder' || isAdmin;
  const isOperator = profile?.role === 'operator' || isWorkflowBuilder;
  const isViewer = profile?.role === 'viewer' || profile?.role === 'user' || isOperator || !!user;

  const signOut = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isWorkflowBuilder,
      isOperator,
      isViewer,
      updateProfile,
      signOut
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
