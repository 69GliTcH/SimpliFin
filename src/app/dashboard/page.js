"use client";

import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import AddSpendingModal from "../components/AddSpendingModal";
import { db, auth } from "../../lib/firebase";
import {
    collection,
    addDoc,
    query,
    onSnapshot,
    deleteDoc,
    doc,
} from "firebase/firestore";
import { useMemo } from "react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    ShoppingCart,
    Airplane,
    House,
    CreditCard,
    Hamburger,
    YoutubeLogo,
    Trash,
    TrendUp
} from "phosphor-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { jsPDF } from "jspdf";

// Category icons mapping
const categoryIcons = {
    Food: <Hamburger className="w-5 h-5 mx-auto" />,
    Travel: <Airplane className="w-5 h-5 mx-auto" />,
    Home: <House className="w-5 h-5 mx-auto" />,
    Subscriptions: <CreditCard className="w-5 h-5 mx-auto" />,
    Entertainment: <YoutubeLogo className="w-5 h-5 mx-auto" />,
    Other: <ShoppingCart className="w-5 h-5 mx-auto" />,
};

export default function Dashboard() {
    const router = useRouter();

    const [user, setUserLocal] = useState(null); // local state for user
    const [spendings, setSpendings] = useState([]);
    const [open, setOpen] = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [dateRange, setDateRange] = useState({ start: null, end: null });
    const [categoryFilter, setCategoryFilter] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showCategory, setShowCategory] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [pressedCards, setPressedCards] = useState({});
    const [deleteClickedCards, setDeleteClickedCards] = useState({});

    const datePickerRef = useRef(null);
    const categoryRef = useRef(null);

    // Listen to auth state for redirect
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setUserLocal(firebaseUser);
            } else {
                setSpendings([]); // Clear spendings
                router.push("/login");
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // Fetch spendings with cleanup to prevent permission errors
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, "users", user.uid, "spendings"));
        const unsubscribeFirestore = onSnapshot(
            q,
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setSpendings(data);
            },
            (error) => {
                if (error.code === "permission-denied") {
                    console.warn("Firestore permission denied, possibly logged out.");
                    setSpendings([]);
                } else {
                    console.error(error);
                }
            }
        );

        return () => unsubscribeFirestore();
    }, [user]);

    // Close datepicker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
                setShowDatePicker(false);
            }
        };
        if (showDatePicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showDatePicker]);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target)) {
                setShowCategory(false);
            }
        };
        if (showCategory) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showCategory]);



    // Update the addSpending function to accept and use the date parameter
    const addSpending = async (amount, category, name, createdAt) => {
    if (!user) return;
    try {
        await addDoc(collection(db, "users", user.uid, "spendings"), {
            amount,
            category,
            name,
            createdAt: new Date(createdAt), // Convert ISO string back to Date object
        });
        toast.success("Spending added!");
    } catch {
        toast.error("Failed to add spending!");
    }
};

    const confirmDelete = (spending) => setDeleteTarget(spending);

    const handleDelete = async () => {
        if (!user || !deleteTarget) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "spendings", deleteTarget.id));
            toast.success("Deleted!");
            setDeleteTarget(null);
        } catch {
            toast.error("Delete failed!");
        }
    };

    // Format date to mm/dd/yyyy
    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    // Sort by date descending
    const sortByDateDescending = (a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
    };

    // Filters
    const filteredSpendings = spendings.filter((s) => {
        let dateMatch = true;
        if (dateRange.start && dateRange.end) {
            const created = s.createdAt?.toDate
                ? s.createdAt.toDate()
                : new Date(s.createdAt);
            dateMatch = created >= dateRange.start && created <= dateRange.end;
        }
        let categoryMatch = true;
        if (categoryFilter) categoryMatch = s.category === categoryFilter;
        return dateMatch && categoryMatch;
    }).sort(sortByDateDescending);

    // Pagination
    const totalPages = Math.ceil(filteredSpendings.length / itemsPerPage);
    const currentItems = filteredSpendings.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const now = new Date();
    const todaySpendings = spendings.filter((s) => {
        const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return (
            created.getDate() === now.getDate() &&
            created.getMonth() === now.getMonth() &&
            created.getFullYear() === now.getFullYear()
        );
    });
    const thisWeekSpendings = spendings.filter((s) => {
        const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        const firstDay = new Date();
        firstDay.setDate(now.getDate() - now.getDay());
        return created >= firstDay && created <= now;
    });
    const thisMonthSpendings = spendings.filter((s) => {
        const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    });

    // Calculate average spending for each period
    const todayAvg = todaySpendings.length > 0
        ? todaySpendings.reduce((sum, s) => sum + s.amount, 0) / todaySpendings.length
        : 0;
    const weekAvg = thisWeekSpendings.length > 0
        ? thisWeekSpendings.reduce((sum, s) => sum + s.amount, 0) / thisWeekSpendings.length
        : 0;
    const monthAvg = thisMonthSpendings.length > 0
        ? thisMonthSpendings.reduce((sum, s) => sum + s.amount, 0) / thisMonthSpendings.length
        : 0;

    // inside your Dashboard component
    const filteredTotal = useMemo(() => {
        return filteredSpendings.reduce((sum, s) => sum + s.amount, 0);
    }, [filteredSpendings]);

    const filteredCount = useMemo(() => filteredSpendings.length, [filteredSpendings]);
    const [pulse, setPulse] = useState(false);

    // Trigger pulse whenever filteredTotal changes
    useEffect(() => {
        if (filteredTotal !== undefined) {
            setPulse(true);
            const timer = setTimeout(() => setPulse(false), 600); // pulse duration
            return () => clearTimeout(timer);
        }
    }, [filteredTotal]);

    const downloadCSV = () => {
        const csvContent = [
            ["Name", "Amount (INR)", "Category", "Date"],
            ...filteredSpendings.map(s => [
                s.name,
                s.amount,
                s.category,
                formatDate(s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt))
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `spendings_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setDownloadOpen(false);
        toast.success("CSV downloaded successfully!");
    };

    const downloadPDF = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text("Spending Report", 105, 20, { align: "center" });

        // Filters info
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);

        const dateRangeText = dateRange.start && dateRange.end
            ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
            : "All Time";

        const categoryText = categoryFilter ? categoryFilter : "All Categories";

        doc.text(`Date Range: ${dateRangeText}`, 14, 35);
        doc.text(`Category: ${categoryText}`, 14, 42);
        doc.text(`Total Transactions: ${filteredCount}`, 14, 49);
        doc.text(`Total Amount: INR ${filteredTotal}`, 14, 56);

        // Table header
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(59, 130, 246);
        doc.rect(14, 65, 182, 10, 'F');
        doc.text("#", 20, 71);
        doc.text("Name", 30, 71);
        doc.text("Amount (INR)", 100, 71);
        doc.text("Category", 130, 71);
        doc.text("Date", 170, 71);

        // Table data
        let yPosition = 75;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        filteredSpendings.forEach((s, index) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
                // Add header to new page
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(59, 130, 246);
                doc.rect(14, 20, 182, 10, 'F');
                doc.text("#", 20, 26);
                doc.text("Name", 30, 26);
                doc.text("Amount (INR)", 100, 26);
                doc.text("Category", 130, 26);
                doc.text("Date", 170, 26);
                yPosition = 30;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
            }

            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(240, 240, 240);
            } else {
                doc.setFillColor(255, 255, 255);
            }
            doc.rect(14, yPosition, 182, 8, 'F');

            doc.text((index + 1).toString(), 20, yPosition + 5);

            // Truncate long names
            const name = s.name.length > 20 ? s.name.substring(0, 17) + "..." : s.name;
            doc.text(name, 30, yPosition + 5);

            doc.text(s.amount.toString(), 100, yPosition + 5);

            // Truncate long categories
            const category = s.category.length > 12 ? s.category.substring(0, 9) + "..." : s.category;
            doc.text(category, 130, yPosition + 5);

            doc.text(formatDate(s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt)), 170, yPosition + 5);

            yPosition += 8;
        });

        // Footer on each page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("© 2025 SimplyFin. Developer's Credit: Saksham Verma. All rights reserved.",
                105, doc.internal.pageSize.height - 10, { align: "center" });
        }

        doc.save(`spendings_report_${new Date().toISOString().split('T')[0]}.pdf`);
        setDownloadOpen(false);
        toast.success("PDF downloaded successfully!");
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <ToastContainer position="top-right" autoClose={1500} />

            {/* Main container with 70% width on large screens */}
            <div className="p-4 md:p-6 space-y-6 mx-auto lg:max-w-[70%]">
                {/* Stat cards - 2 columns on mobile, 4 columns on desktop */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 px-2">
                    {/** Today Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-blue-600 rounded-xl p-4 shadow-md cursor-pointer w-full"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm">Today</p>
                            {/* Average - only visible on large screens */}
                            <div className="hidden lg:flex items-center text-xs opacity-80">
                                <TrendUp className="w-3 h-3 mr-1" />
                                ₹{todayAvg.toFixed(0)} avg
                            </div>
                        </div>
                        <p className="font-bold text-xl">
                            ₹{todaySpendings.reduce((sum, s) => sum + s.amount, 0)}
                        </p>
                        <p className="text-xs">{todaySpendings.length} transaction(s)</p>
                    </motion.div>

                    {/** This Week Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-purple-600 rounded-xl p-4 shadow-md cursor-pointer w-full"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm">This Week</p>
                            {/* Average - only visible on large screens */}
                            <div className="hidden lg:flex items-center text-xs opacity-80">
                                <TrendUp className="w-3 h-3 mr-1" />
                                ₹{weekAvg.toFixed(0)} avg
                            </div>
                        </div>
                        <p className="font-bold text-xl">
                            ₹{thisWeekSpendings.reduce((sum, s) => sum + s.amount, 0)}
                        </p>
                        <p className="text-xs">{thisWeekSpendings.length} transaction(s)</p>
                    </motion.div>

                    {/** This Month Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-yellow-600 rounded-xl p-4 shadow-md cursor-pointer w-full"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm">This Month</p>
                            {/* Average - only visible on large screens */}
                            <div className="hidden lg:flex items-center text-xs opacity-80">
                                <TrendUp className="w-3 h-3 mr-1" />
                                ₹{monthAvg.toFixed(0)} avg
                            </div>
                        </div>
                        <p className="font-bold text-xl">
                            ₹{thisMonthSpendings.reduce((sum, s) => sum + s.amount, 0)}
                        </p>
                        <p className="text-xs">{thisMonthSpendings.length} transaction(s)</p>
                    </motion.div>

                    {/** Filtered Total Card */}
                    <motion.div
                        key={filteredTotal}
                        className="rounded-xl p-4 shadow-md cursor-pointer w-full bg-green-600"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-sm text-white">Filtered Total</p>
                            {/* Average - only visible on large screens */}
                            <div className="hidden lg:flex items-center text-xs text-white opacity-80">
                                <TrendUp className="w-3 h-3 mr-1" />
                                ₹{filteredCount > 0 ? (filteredTotal / filteredCount).toFixed(0) : 0} avg
                            </div>
                        </div>
                        <p className="font-bold text-xl text-white">
                            ₹{filteredTotal}
                        </p>
                        <p className="text-xs text-white">
                            {filteredCount} transaction(s)
                        </p>
                    </motion.div>
                </div>

                {/* Filters & Add */}
                <div className="flex justify-center gap-4 flex-wrap mt-4">
                    {/* Date Range Picker */}
                    <div className="relative" ref={datePickerRef}>
                        <button
                            onClick={() => setShowDatePicker((prev) => !prev)}
                            className="flex items-center justify-between gap-2 w-52 px-4 py-2 bg-gray-800 
                       hover:bg-gray-700 rounded-lg cursor-pointer text-white 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <span className="truncate">
                                {dateRange.start && dateRange.end
                                    ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                                    : "Date Range Filter"}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${showDatePicker ? "rotate-180" : ""
                                    }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showDatePicker && (
                            <div className="absolute mt-2 z-50 bg-gray-900/70 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg left-[-30]">
                                <DatePicker
                                    selected={dateRange.start}
                                    onChange={(dates) => {
                                        const [start, end] = dates;
                                        setDateRange({ start, end });
                                        if (start && end) setShowDatePicker(false);
                                    }}
                                    startDate={dateRange.start}
                                    endDate={dateRange.end}
                                    selectsRange
                                    inline
                                />
                            </div>
                        )}
                    </div>

                    {/* Category Filter (custom dropdown like date range) */}
                    <div className="relative" ref={categoryRef}>
                        <button
                            onClick={() => setShowCategory((prev) => !prev)}
                            className="flex items-center justify-between w-52 px-4 py-2 
                        bg-gray-800 
                        hover:bg-gray-700
                rounded-lg cursor-pointer text-white 
                focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <span className="truncate">
                                {categoryFilter ? categoryFilter : "All Categories"}
                            </span>
                            <svg
                                className={`w-4 h-4 transition-transform duration-200 ${showCategory ? "rotate-180" : ""}`}
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
                                    transition={{ duration: 0.2 }}
                                    className="absolute left-0 mt-2 w-52 p-2 rounded-xl shadow-lg z-50
                   bg-gray-900/70 backdrop-blur-md border border-white/10"
                                >
                                    {/* All Categories */}
                                    <li
                                        className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer 
                     text-white/90 hover:bg-gray-800/60 transition"
                                        onClick={() => {
                                            setCategoryFilter("");
                                            setShowCategory(false);
                                        }}
                                    >
                                        <span className="w-5 h-5 flex items-center justify-center">
                                            📊
                                        </span>
                                        All Categories
                                    </li>

                                    {/* Dynamic Categories */}
                                    {Object.keys(categoryIcons).map((c) => (
                                        <li
                                            key={c}
                                            className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer 
                       text-white/90 hover:bg-gray-800/60 transition"
                                            onClick={() => {
                                                setCategoryFilter(c);
                                                setShowCategory(false);
                                            }}
                                        >
                                            <span className="w-5 h-5 flex items-center justify-center">
                                                {categoryIcons[c]}
                                            </span>
                                            {c}
                                        </li>
                                    ))}
                                </motion.ul>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Reset Filters */}
                    <button
                        onClick={() => {
                            setCategoryFilter("");
                            setDateRange({ start: null, end: null });
                            toast.info("Filters reset!");
                        }}
                        className="px-4 py-2 w-38 bg-gray-600 hover:bg-gray-500 rounded-lg text-white cursor-pointer 
                   transition focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        Reset Filters
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={() => setDownloadOpen(true)}
                        className="px-4 py-2 w-38 bg-green-600 hover:bg-green-700 rounded-lg text-white cursor-pointer 
               transition focus:outline-none focus:ring-2 focus:ring-green-500 text-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                    </button>

                    {/* Add Spending */}
                    <button
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 w-38 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer 
                   transition focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        + Add Spending
                    </button>
                </div>

                {/* Desktop Table - Improved styling with index column */}
                <div className="hidden sm:block overflow-x-auto mt-4 rounded-lg border border-gray-700 bg-gray-800 shadow-lg">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-750 text-gray-200">
                                <th className="p-3 text-center text-xs font-medium uppercase tracking-wider">#</th>
                                <th className="p-3 text-center text-xs font-medium uppercase tracking-wider">Icon</th>
                                <th className="p-3 text-xs font-medium uppercase tracking-wider">Name</th>
                                <th className="p-3 text-xs font-medium uppercase tracking-wider">Amount</th>
                                <th className="p-3 text-xs font-medium uppercase tracking-wider">Category</th>
                                <th className="p-3 text-xs font-medium uppercase tracking-wider">Date</th>
                                <th className="p-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {currentItems.map((s, idx) => {
                                    const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                                    const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1;

                                    return (
                                        <motion.tr
                                            key={s.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className={`border-t border-gray-700 ${idx % 2 === 0 ? "bg-gray-800" : "bg-gray-780"} hover:bg-gray-700 transition-colors`}
                                        >
                                            <td className="p-3 text-center text-sm text-gray-300">{globalIndex}</td>
                                            <td className="p-3 text-center">{categoryIcons[s.category]}</td>
                                            <td className="p-3 font-medium">{s.name}</td>
                                            <td className="p-3 font-semibold">₹{s.amount}</td>
                                            <td className="p-3">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-100">
                                                    {s.category}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-gray-300">{formatDate(created)}</td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => confirmDelete(s)}
                                                    className="inline-flex cursor-pointer items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-rose-700 hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View with vertical DELETE - Index removed for small screens */}
                <div className="sm:hidden mt-4 space-y-4">
                    <AnimatePresence>
                        {currentItems.map((s, idx) => {
                            const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);

                            const isPressed = pressedCards[s.id] || false;
                            const isDeleteClicked = deleteClickedCards[s.id] || false;

                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: isPressed ? -5 : 0, scale: isPressed ? 1.05 : 1 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className={`flex overflow-hidden rounded-xl shadow-md cursor-pointer transition-colors duration-200
            ${isPressed ? "bg-gray-700" : "bg-gray-800"} hover:bg-gray-700`}
                                    onClick={() => {
                                        setPressedCards((prev) => ({ ...prev, [s.id]: true }));
                                        setTimeout(() => setPressedCards((prev) => ({ ...prev, [s.id]: false })), 200);
                                    }}
                                >
                                    {/* Left 90%: Info */}
                                    <div className="w-9/10 p-4 flex flex-col justify-between space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{categoryIcons[s.category]}</span>
                                                <span className="font-semibold text-white text-lg truncate">{s.name}</span>
                                            </div>
                                            <span className="font-bold text-blue-400 text-lg">₹{s.amount}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-300 text-sm">
                                            <span className="capitalize">{s.category}</span>
                                            <span>{formatDate(created)}</span>
                                        </div>
                                    </div>

                                    {/* Right 10%: Vertical DELETE */}
                                    <div
                                        className={`w-1/10 flex justify-center items-center cursor-pointer transition-colors
              ${isDeleteClicked ? "bg-rose-600" : "bg-rose-700"}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteClickedCards((prev) => ({ ...prev, [s.id]: true }));
                                            confirmDelete(s);
                                            setTimeout(() => setDeleteClickedCards((prev) => ({ ...prev, [s.id]: false })), 300);
                                        }}
                                    >
                                        <span className="text-white cursor-pointer font-bold tracking-widest transform -rotate-90 whitespace-nowrap text-xs">
                                            DELETE
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`px-3 cursor-pointer py-1 rounded ${currentPage === i + 1
                                    ? "bg-blue-600"
                                    : "bg-gray-700 hover:bg-gray-600"
                                    }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Add Spending Modal */}
            <AddSpendingModal open={open} setOpen={setOpen} addSpending={addSpending} />

            {/* Download Data Modal */}
            <AnimatePresence>
                {downloadOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0  bg-opacity-50 flex justify-center items-center z-50 backdrop-blur-sm p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-gray-900 p-6 rounded-xl w-full max-w-sm shadow-lg mx-auto border border-gray-600"
                        >
                            <h2 className="text-xl font-semibold mb-5 text-white text-center">
                                Download Data
                            </h2>

                            {/* Filters info */}
                            <div className="bg-gray-800 p-4 rounded-lg mb-5 border border-gray-600">
                                <p className="text-sm text-gray-300 text-center mb-3">Current Filters:</p>
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                                        <span className="text-gray-300">Date Range:</span>
                                        <span className="text-gray-100 font-medium">
                                            {dateRange.start && dateRange.end
                                                ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                                                : "All Time"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                                        <span className="text-gray-300">Category:</span>
                                        <span className="text-gray-100 font-medium">{categoryFilter || "All Categories"}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                                        <span className="text-gray-300">Transactions:</span>
                                        <span className="text-gray-100 font-medium">{filteredCount} items</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-300">Total Amount:</span>
                                        <span className="text-gray-100 font-medium">₹{filteredTotal}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Download buttons */}
                            <div className="flex justify-center gap-3 mb-5">
                                <button
                                    onClick={downloadPDF}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2
                                transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                border border-blue-500"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    PDF
                                </button>
                                <button
                                    onClick={downloadCSV}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white cursor-pointer 
                                focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2
                                transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                border border-green-500"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    CSV
                                </button>
                            </div>

                            {/* Close button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setDownloadOpen(false)}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white cursor-pointer 
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                border border-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
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
                            className="bg-gray-900 p-6 rounded-xl w-full max-w-sm shadow-lg mx-auto border border-gray-600"
                        >
                            <h2 className="text-xl font-semibold mb-5 text-white text-center">
                                Confirm Delete
                            </h2>

                            {/* Mini Card for Info */}
                            <div className="bg-gray-800 p-4 rounded-lg mb-5 border border-gray-600">
                                <p className="text-sm text-gray-300 text-center mb-3">Spending Details:</p>
                                <div className="text-sm space-y-2">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600">
                                        <span className="text-gray-300">Name:</span>
                                        <span className="text-gray-100 font-medium">{deleteTarget.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600">
                                        <span className="text-gray-300">Amount:</span>
                                        <span className="text-gray-100 font-medium">₹{deleteTarget.amount}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-600">
                                        <span className="text-gray-300">Category:</span>
                                        <span className="text-gray-100 font-medium capitalize">{deleteTarget.category}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-300">Date:</span>
                                        <span className="text-gray-100 font-medium">
                                            {formatDate(deleteTarget.createdAt?.toDate ? deleteTarget.createdAt.toDate() : deleteTarget.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Confirmation Buttons */}
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="px-6 py-2 bg-rose-600 hover:bg-rose-700 rounded-lg text-white cursor-pointer 
                                focus:outline-none focus:ring-2 focus:ring-rose-500
                                transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                border border-rose-500"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white cursor-pointer 
                                focus:outline-none focus:ring-2 focus:ring-gray-500
                                transform hover:scale-105 active:scale-95 transition duration-150 ease-in-out
                                border border-gray-500"
                                >
                                    No
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <footer className="w-full py-6 bg-gray-900 text-center">
                <p className="text-gray-500 text-sm">
                    &copy; 2025 SimplyFin.<br />
                    
                    All rights reserved.
                </p>
            </footer>
        </div>
    );
}
