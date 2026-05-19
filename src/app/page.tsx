"use client";

import { useState, useEffect } from "react";
import { Chat } from "./components/chat";
import { Splash } from "./components/splash";

export default function Home() {
  // null = not yet determined (prevents flash)
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem("splash-seen");
      setShowSplash(!seen);
    } catch {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    try { sessionStorage.setItem("splash-seen", "true"); } catch {}
    setShowSplash(false);
  };

  // Blank white until we know which path to take
  if (showSplash === null) {
    return <div className="h-full bg-white" />;
  }

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  return <Chat />;
}
