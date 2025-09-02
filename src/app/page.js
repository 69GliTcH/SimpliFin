"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "../lib/firebase";
import { signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { GoogleLogo } from "phosphor-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    const points = ["Track", "Journal", "Analyze"];

    // Animate key points
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % points.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Listen for auth state changes and redirect if logged in
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                router.push("/dashboard"); // redirect if already logged in
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Handle Google login with persistent session
    const handleGoogleLogin = async () => {
        if (loading) return;
        setLoading(true);

        try {
            // Ensure auth persists across refresh and browser closes
            await setPersistence(auth, browserLocalPersistence);

            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;

            // Save user info in Firestore
            await setDoc(
                doc(db, "users", firebaseUser.uid),
                {
                    name: firebaseUser.displayName,
                    email: firebaseUser.email,
                    lastLogin: serverTimestamp(),
                },
                { merge: true }
            );

            router.push("/dashboard");
        } catch (error) {
            console.error("Login error:", error.message);
            alert("Failed to login. Try again.");
        } finally {
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
                SimplyFin helps you keep track of your daily expenses and manage your
                finances easily.<br />
                Analyze your spending patterns, stay on top of your budget, and make
                smarter financial decisions.
            </p>

            {/* Google Login Button */}
            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className={`flex items-center gap-3 px-6 py-3 rounded-lg transition text-lg shadow-md cursor-pointer ${loading
                    ? "bg-gray-500 text-gray-300"
                    : "bg-white text-gray-900 hover:bg-gray-100"

                    }`}
            >
                {loading ? (
                    <span>Logging in...</span>
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
