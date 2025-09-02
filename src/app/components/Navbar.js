"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "react-toastify";
import { Menu, X } from "lucide-react";
import "react-toastify/dist/ReactToastify.css";

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Logged out successfully!");
            router.push("/");
        } catch (err) {
            toast.error("Logout failed. Try again.");
        }
    };

    return (
        <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="bg-gray-900 p-4 shadow-md sticky top-0 z-50"
        >
            <div className="flex items-center justify-between">
                {/* Left side - user info */}
                <div className="flex items-center gap-3">
                    <img
                        src={user?.photoURL ?? "/stock.jpg"}
                        alt="Profile"
                        className="w-10 h-10 rounded-full border-2 border-gray-700"
                    />
                    <span className="font-semibold text-gray-100 text-lg">
                        {user?.displayName || "User"}
                    </span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex gap-4 items-center">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/dashboard")}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-all cursor-pointer"
                    >
                        Dashboard
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => router.push("/analytics")}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-medium transition-all cursor-pointer"
                    >
                        Analytics
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogout}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-900 rounded-lg text-white font-medium transition-all cursor-pointer"
                    >
                        Logout
                    </motion.button>
                </div>

                {/* Mobile Hamburger */}
                <div className="md:hidden">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="text-white">
                        {menuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Mobile Floating Menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-16 right-4 w-48 p-4 rounded-2xl backdrop-blur-md bg-gray-800/70 shadow-lg flex flex-col gap-3 z-50"
                    >
                        <button
                            onClick={() => { router.push("/dashboard"); setMenuOpen(false); }}
                            className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-md text-white text-left"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => { router.push("/analytics"); setMenuOpen(false); }}
                            className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-md text-white text-left"
                        >
                            Analytics
                        </button>
                        <button
                            onClick={() => { handleLogout(); setMenuOpen(false); }}
                            className="px-4 py-2 bg-blue-700/80 hover:bg-blue-900/80 rounded-md text-white text-left"
                        >
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
