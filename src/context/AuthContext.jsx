import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, loginWithGoogle, logout, onAuthChange } from "../lib/firebase";
import { getDownloadCount, incrementDownloads, hasReachedLimit, getRemainingFree, FREE_DOWNLOAD_LIMIT } from "../lib/downloads";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloads, setDownloads] = useState(getDownloadCount());
  const [showLoginGate, setShowLoginGate] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      setShowLoginGate(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  // Call this before every download action
  const requestDownload = () => {
    // If user is logged in, always allow
    if (user) return true;

    // Check free limit
    if (hasReachedLimit()) {
      setShowLoginGate(true);
      return false;
    }

    // Consume one free download
    const newCount = incrementDownloads();
    setDownloads(newCount);
    return true;
  };

  const value = {
    user,
    loading,
    downloads,
    remaining: user ? Infinity : getRemainingFree(),
    isUnlimited: !!user,
    showLoginGate,
    setShowLoginGate,
    handleLogin,
    handleLogout,
    requestDownload,
    FREE_DOWNLOAD_LIMIT,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
