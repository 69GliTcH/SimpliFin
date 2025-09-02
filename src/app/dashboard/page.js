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
} from "phosphor-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

    const addSpending = async (amount, category, name) => {
        if (!user) return;
        try {
            await addDoc(collection(db, "users", user.uid, "spendings"), {
                amount,
                category,
                name,
                createdAt: new Date(),
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
    });

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

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <Navbar />
            <ToastContainer position="top-right" autoClose={1500} />
            <div className="p-6 space-y-6">
                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 px-2">
                    {/** Today Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="bg-blue-600 rounded-xl p-4 shadow-md cursor-pointer w-full"
                    >
                        <p className="text-sm">Today</p>
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
                        <p className="text-sm">This Week</p>
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
                        <p className="text-sm">This Month</p>
                        <p className="font-bold text-xl">
                            ₹{thisMonthSpendings.reduce((sum, s) => sum + s.amount, 0)}
                        </p>
                        <p className="text-xs">{thisMonthSpendings.length} transaction(s)</p>
                    </motion.div>

                    {/** Lifetime Card */}
                    {/** Lifetime Card showing filtered spendings */}
                    <motion.div
                        key={filteredTotal} // triggers animation whenever value changes
                        className="rounded-xl p-4 shadow-md cursor-pointer w-full bg-green-600"
                        animate={{
                            backgroundColor: [
                                "#01a36a", // Tailwind green-600
                                "#01a36a", // lighter green
                                "#01a36a", // back to normal
                            ],
                        }}
                        transition={{
                            duration: 3,
                            ease: "easeInOut",
                            repeat: Infinity,
                        }}
                    >
                        <motion.p
                            className="text-sm text-white"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatType: "loop", delay: 0 }}
                        >
                            Filtered Total
                        </motion.p>

                        <motion.p
                            className="font-bold text-xl text-white"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatType: "loop", delay: 0.2 }}
                        >
                            ₹{filteredTotal}
                        </motion.p>

                        <motion.p
                            className="text-xs text-white"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1, ease: "easeInOut", repeat: Infinity, repeatType: "loop", delay: 0.4 }}
                        >
                            {filteredCount} transaction(s)
                        </motion.p>

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
                                    : "Select Date Range"}
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
                            <div className="absolute mt-2 z-50 bg-red-900/70 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg left-[-30]">
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
                            className="flex items-center justify-between gap-2 w-52 px-4 py-2 bg-gray-800 
                       hover:bg-gray-700 rounded-lg cursor-pointer text-white 
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
                                    <li
                                        className="px-3 py-2 rounded-md cursor-pointer text-white/90 hover:bg-gray-800/60 transition"
                                        onClick={() => {
                                            setCategoryFilter("");
                                            setShowCategory(false);
                                        }}
                                    >
                                        All Categories
                                    </li>
                                    {Object.keys(categoryIcons).map((c) => (
                                        <li
                                            key={c}
                                            className="px-3 py-2 rounded-md cursor-pointer text-white/90 hover:bg-gray-800/60 transition"
                                            onClick={() => {
                                                setCategoryFilter(c);
                                                setShowCategory(false);
                                            }}
                                        >
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

                    {/* Add Spending */}
                    <button
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 w-38 bg-blue-600 hover:bg-blue-700 rounded-lg text-white cursor-pointer 
                   transition focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        + Add Spending
                    </button>
                </div>




                {/* Table */}
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto mt-4">
                    <table className="w-full text-left table-auto border-collapse">
                        <thead>
                            <tr className="border-b border-gray-600 bg-gray-800 text-gray-200">
                                <th className="p-2 text-center">Icon</th>
                                <th className="p-2">Name</th>
                                <th className="p-2">Amount</th>
                                <th className="p-2">Category</th>
                                <th className="p-2">Date</th>
                                <th className="p-2 text-center"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {currentItems
                                    .slice() // to avoid mutating original array
                                    .sort((a, b) => {
                                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                                        return dateB - dateA; // newest first
                                    })
                                    .map((s, idx) => {
                                        const created = s.createdAt?.toDate ? s.createdAt.toDate() : new Date(s.createdAt);
                                        return (
                                            <motion.tr
                                                key={s.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className={`border-b border-gray-700 ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800"} hover:bg-gray-700 transition-colors`}
                                            >
                                                <td className="p-2 text-center">{categoryIcons[s.category]}</td>
                                                <td className="p-2">{s.name}</td>
                                                <td className="p-2">₹{s.amount}</td>
                                                <td className="p-2">{s.category}</td>
                                                <td className="p-2">{created.toLocaleDateString()}</td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => confirmDelete(s)}
                                                        className="bg-rose-600 hover:bg-rose-800 p-2 rounded-full cursor-pointer transition-colors"
                                                    >
                                                        <Trash className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>


                {/* Mobile Card View with vertical DELETE */}
                <div className="sm:hidden mt-4 space-y-4">
                    <AnimatePresence>
                        {currentItems
                            .slice() // avoid mutating original array
                            .sort((a, b) => {
                                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                                return dateB - dateA; // newest first
                            })
                            .map((s) => {
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
                                                <span>{created.toLocaleDateString()}</span>
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
                                            <span className="text-white font-bold tracking-widest transform -rotate-90 whitespace-nowrap text-xs">
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

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteTarget && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-gray-800 p-6 rounded-xl space-y-4 w-full max-w-md"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                        >
                            <h2 className="text-lg font-semibold text-white text-center">
                                Confirm Delete
                            </h2>

                            {/* Mini Card for Info (no delete button) */}
                            {/* Mini Card for Info (no delete button) */}
                            <div className="flex flex-col gap-2 overflow-hidden rounded-lg bg-gray-900 shadow-md p-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{categoryIcons[deleteTarget.category]}</span>
                                        <span className="font-semibold text-white text-lg truncate">{deleteTarget.name}</span>
                                    </div>
                                    <div className="text-white font-bold text-lg">
                                        ₹{deleteTarget.amount}
                                    </div>
                                </div>
                                <div className="flex justify-between text-gray-300 text-sm">
                                    <span className="capitalize">{deleteTarget.category}</span>
                                    <span>{deleteTarget.createdAt?.toDate
                                        ? deleteTarget.createdAt.toDate().toLocaleDateString()
                                        : new Date(deleteTarget.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>


                            {/* Confirmation Buttons */}
                            <div className="flex justify-center gap-4 mt-4">
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 bg-rose-800 rounded-lg hover:bg-rose-600 text-white
                                    cursor-pointer transform hover:scale-105 active:scale-95 
               transition duration-150 ease-in-out"
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500 text-white
                                    cursor-pointer transform hover:scale-105 active:scale-95 
               transition duration-150 ease-in-out"
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
                    Developer&apos;s Credit: <span className="font-semibold">Saksham Verma</span>.<br />
                    All rights reserved.
                </p>
            </footer>


        </div>
    );
}