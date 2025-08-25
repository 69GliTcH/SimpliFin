"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Navbar() {
    const { user, logout } = useAuth(); // ✅ logout comes from AuthContext
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout(); // works now
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
            className="flex items-center justify-between bg-gray-900 p-4 rounded-b-xl shadow-md sticky top-0 z-50"
        >
            <div className="flex items-center gap-4">
                <img
                    src={user?.photoURL || "/default.png"}
                    alt="Profile"
                    className="w-10 h-10 rounded-full border-2 border-gray-700"
                />
                <span className="font-semibold text-gray-100 text-lg">
                    {user?.displayName || "User"}
                </span>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout} // ✅ works now
                className="px-4 py-2 bg-blue-900 hover:bg-blue-700 rounded-full text-white font-medium transition-all cursor-pointer"
            >
                Logout
            </motion.button>
        </motion.div>
    );
}
