"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

const categories = ["Food", "Travel", "Subscriptions", "Home", "Entertainment", "Other"];

export default function AddSpendingModal({ open, setOpen, addSpending }) {
    const [amount, setAmount] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState(categories[0]);
    const [showCategory, setShowCategory] = useState(false);

    const categoryRef = useRef(null);

    // close dropdown if clicked outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) {
                setShowCategory(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !name) {
            toast.error("Please enter name and amount");
            return;
        }

        try {
            await addSpending(Number(amount), category, name);
            toast.success("Spending added successfully!");
            setAmount("");
            setName("");
            setCategory(categories[0]);
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to add spending");
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-gray-900 p-6 rounded-xl w-full max-w-sm shadow-lg mx-auto"
                    >
                        <h2 className="text-xl font-semibold mb-5 text-white text-center">
                            Add New Spending
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <input
                                type="text"
                                placeholder="Enter spending name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />

                            {/* Amount + Category in one row */}
                            <div className="flex gap-3">
                                {/* Amount */}
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="Amount"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-7 pr-4 py-2 rounded-lg bg-gray-700 text-white border border-gray-600
                                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                                 [appearance:textfield]
                                                 [&::-webkit-outer-spin-button]:appearance-none
                                                 [&::-webkit-inner-spin-button]:appearance-none
                                                 [-moz-appearance:textfield]"
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </div>

                                {/* Category dropdown */}
                                <div className="relative flex-1" ref={categoryRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategory((prev) => !prev)}
                                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-700 rounded-lg text-white 
                                                 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                                 focus:border-transparent cursor-pointer"
                                    >
                                        <span className="truncate">{category}</span>
                                        <svg
                                            className={`w-4 h-4 transition-transform ${showCategory ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    <AnimatePresence>
                                        {showCategory && (
                                            <motion.ul
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -5 }}
                                                transition={{ duration: 0.15 }}
                                                className="absolute left-0 right-0 mt-1 bg-gray-700 backdrop-blur-md border border-gray-600 rounded-lg shadow-lg z-20"
                                            >
                                                {categories.map((cat) => (
                                                    <li
                                                        key={cat}
                                                        onClick={() => {
                                                            setCategory(cat);
                                                            setShowCategory(false);
                                                        }}
                                                        className="px-4 py-2 hover:bg-gray-600 cursor-pointer text-white border-b border-gray-600 last:border-b-0"
                                                    >
                                                        {cat}
                                                    </li>
                                                ))}
                                            </motion.ul>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white cursor-pointer 
                                             focus:outline-none focus:ring-2 focus:ring-gray-500
                                             transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer 
                                             focus:outline-none focus:ring-2 focus:ring-blue-500
                                             transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}