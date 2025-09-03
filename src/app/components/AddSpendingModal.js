"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const categories = ["Food", "Travel", "Subscriptions", "Home", "Entertainment", "Other"];

export default function AddSpendingModal({ open, setOpen, addSpending }) {
    const [amount, setAmount] = useState("");
    const [name, setName] = useState("");
    const [category, setCategory] = useState(categories[0]);
    const [date, setDate] = useState(new Date());
    const [showCategory, setShowCategory] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const categoryRef = useRef(null);
    const datePickerRef = useRef(null);

    // Set default date to today when modal opens
    useEffect(() => {
        if (open) {
            setDate(new Date());
        }
    }, [open]);

    // Close dropdown if clicked outside
    useEffect(() => {
        function handleClickOutside(e) {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) {
                setShowCategory(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !name || !date) {
            toast.error("Please enter name, amount, and date");
            return;
        }

        try {
            const selectedDate = new Date(date);
            const today = new Date();
            const isToday = selectedDate.toDateString() === today.toDateString();
            
            if (isToday) {
                // If today's date is selected, use current time
                const timestamp = new Date().toISOString();
                await addSpending(Number(amount), category, name, timestamp);
            } else {
                // If past date is selected, use 12:00:00 time
                selectedDate.setHours(12, 0, 0, 0);
                const timestamp = selectedDate.toISOString();
                await addSpending(Number(amount), category, name, timestamp);
            }
            
            toast.success("Spending added successfully!");
            setAmount("");
            setName("");
            setDate(new Date());
            setCategory(categories[0]);
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to add spending");
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
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
                        className="bg-gray-900 p-6 rounded-xl w-full max-w-md shadow-lg mx-auto border border-gray-600"
                    >
                        <h2 className="text-xl font-semibold mb-6 text-white text-center">
                            Add New Spending
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name - Full width */}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Spending Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter spending name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-600
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             placeholder:text-gray-400"
                                />
                            </div>

                            {/* Amount - Full width */}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-300 font-medium">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-600
                                                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                                 [appearance:textfield]
                                                 [&::-webkit-outer-spin-button]:appearance-none
                                                 [&::-webkit-inner-spin-button]:appearance-none
                                                 [-moz-appearance:textfield]
                                                 placeholder:text-gray-400"
                                        onWheel={(e) => e.currentTarget.blur()}
                                    />
                                </div>
                            </div>

                            {/* Date and Category in same row */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Date Picker */}
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-300 font-medium">Date</label>
                                    <div className="relative" ref={datePickerRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowDatePicker((prev) => !prev)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg text-white 
                                                     border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                                     focus:border-transparent cursor-pointer hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="truncate text-left">{formatDate(date)}</span>
                                            <svg
                                                className={`w-4 h-4 transition-transform ${showDatePicker ? "rotate-180" : ""}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        <AnimatePresence>
                                            {showDatePicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute mt-2 z-50 bg-gray-900/70 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg"
                                                >
                                                    <DatePicker
                                                        selected={date}
                                                        onChange={(selectedDate) => {
                                                            setDate(selectedDate);
                                                            setShowDatePicker(false);
                                                        }}
                                                        inline
                                                        maxDate={new Date()}
                                                        className="bg-transparent"
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Category dropdown */}
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-300 font-medium">Category</label>
                                    <div className="relative" ref={categoryRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowCategory((prev) => !prev)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 rounded-lg text-white 
                                                     border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 
                                                     focus:border-transparent cursor-pointer hover:bg-gray-700 transition-colors"
                                        >
                                            <span className="truncate text-left">{category}</span>
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
                                                    className="absolute left-0 right-0 mt-1 bg-gray-800 backdrop-blur-md border border-gray-600 rounded-lg shadow-lg z-20"
                                                >
                                                    {categories.map((cat) => (
                                                        <li
                                                            key={cat}
                                                            onClick={() => {
                                                                setCategory(cat);
                                                                setShowCategory(false);
                                                            }}
                                                            className="px-4 py-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0 transition-colors"
                                                        >
                                                            {cat}
                                                        </li>
                                                    ))}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-center gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-8 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg text-white cursor-pointer 
                                             focus:outline-none focus:ring-2 focus:ring-gray-500
                                             transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                             border border-gray-500 font-medium"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer 
                                             focus:outline-none focus:ring-2 focus:ring-blue-500
                                             transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                             border border-blue-500 font-medium"
                                >
                                    Add Spending
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}