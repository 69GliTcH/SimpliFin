"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { GoogleLogo } from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const points = ["Track", "Journal", "Analyze"];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % points.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: user.displayName,
          email: user.email,
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Failed to login. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center px-4 text-center">
      <h1 className="text-5xl font-bold text-white mb-8 animate-pulse">
        SimplyFin
      </h1>

      {/* Animated Key Points */}
      <div className="mb-8 h-12">
        <AnimatePresence mode="wait">
          <motion.p
            key={points[activeIndex]}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
            className="text-gray-400 text-xl font-medium"
          >
            {points[activeIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-gray-400 text-center max-w-md mx-auto mb-8">
        SimplyFin helps you keep track of your daily expenses and manage your finances easily.<br />
        Analyze your spending patterns, stay on top of your budget, and make smarter financial decisions.
      </p>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className={`flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-lg 
                            hover:bg-gray-100 transition text-lg shadow-md cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
      >
        {loading ? (
          <span className="animate-pulse">Loading...</span>
        ) : (
          <>
            <GoogleLogo size={24} weight="fill" />
            <span>Continue with Google</span>
          </>
        )}
      </button>

      <p className="text-gray-500 mt-12 text-sm text-center">
        &copy; 2025 SimplyFin.<br />
        Developer&apos;s Credit: <span className="font-semibold">Saksham Verma</span>.<br />
        All rights reserved.
      </p>
    </div>
  );
}
