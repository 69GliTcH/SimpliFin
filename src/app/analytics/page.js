"use client";

import { useEffect, useState, useRef } from "react";
import Navbar from "../components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import { db, auth } from "../../lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    ShoppingCart,
    Airplane,
    House,
    CreditCard,
    Hamburger,
    YoutubeLogo,
} from "phosphor-react";

// Category icons mapping
const categoryIcons = {
    Food: <Hamburger className="w-5 h-5 mx-auto" />,
    Travel: <Airplane className="w-5 h-5 mx-auto" />,
    Home: <House className="w-5 h-5 mx-auto" />,
    Subscriptions: <CreditCard className="w-5 h-5 mx-auto" />,
    Entertainment: <YoutubeLogo className="w-5 h-5 mx-auto" />,
    Other: <ShoppingCart className="w-5 h-5 mx-auto" />,
};

const COLORS = ["#3b82f6", "#eab308", "#22c55e", "#ef4444", "#a855f7", "#14b8a6"];
const ALL_CATEGORIES = ["Food", "Other", "Home", "Subscriptions", "Travel", "Entertainment"];

// Fixed color mapping for each category
const CATEGORY_COLORS = {
    Food: "#3b82f6",
    Other: "#eab308",
    Home: "#22c55e",
    Subscriptions: "#ef4444",
    Travel: "#a855f7",
    Entertainment: "#14b8a6"
};

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label, chartType }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        return (
            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 shadow-lg">
                <p className="text-gray-300">
                    {chartType === "line" ? `Date: ${label}` : `Category: ${payload[0].name}`}
                </p>
                {data.isAggregated && (
                    <div className="mt-2 pt-2 border-t border-gray-700">
                        <p className="text-sm text-gray-400">
                            {data.count} transaction{data.count > 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

// Date range display component
const DateRangeDisplay = ({ start, end }) => {
    if (!start && !end) return "Date Range Filter";

    return `${start ? start.toLocaleDateString() : "Start"} - ${end ? end.toLocaleDateString() : "End"}`;
};

// Custom label for pie chart (outside the chart with connecting line)
const RenderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name, index }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const color = CATEGORY_COLORS[name] || COLORS[index % COLORS.length];

    return (
        <g>
            {/* Connecting line from pie to label */}
            <line
                x1={cx + outerRadius * Math.cos(-midAngle * RADIAN)}
                y1={cy + outerRadius * Math.sin(-midAngle * RADIAN)}
                x2={x}
                y2={y}
                stroke={color}
                strokeWidth={1}
            />
            <text
                x={x}
                y={y}
                fill={color}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="12"
                fontWeight="bold"
            >
                {`₹${value}`}
            </text>
        </g>
    );
};

export default function AnalyticsPage() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    // Pie chart state
    const [pieExpenses, setPieExpenses] = useState([]);
    const [pieStart, setPieStart] = useState(null);
    const [pieEnd, setPieEnd] = useState(null);
    const pieDateRef = useRef(null);
    const [showPieDatePicker, setShowPieDatePicker] = useState(false);

    // Line chart state
    const [lineExpenses, setLineExpenses] = useState([]);
    const [lineStart, setLineStart] = useState(null);
    const [lineEnd, setLineEnd] = useState(null);
    const [lineCategory, setLineCategory] = useState("");
    const lineDateRef = useRef(null);
    const lineCategoryRef = useRef(null);
    const [showLineDatePicker, setShowLineDatePicker] = useState(false);
    const [showLineCategory, setShowLineCategory] = useState(false);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);
        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    // Listen to auth
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) setUser(firebaseUser);
            else setUser(null);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Fetch spendings
    useEffect(() => {
        if (!user) return;

        setIsLoading(true);
        const q = query(collection(db, "users", user.uid, "spendings"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate
                        ? doc.data().createdAt.toDate()
                        : new Date(doc.data().createdAt),
                }));
                setPieExpenses(list);
                setLineExpenses(list);
                setIsLoading(false);
            },
            (error) => {
                console.error(error);
                setPieExpenses([]);
                setLineExpenses([]);
                setIsLoading(false);
            }
        );
        return () => unsubscribe();
    }, [user]);

    // Filtered Pie Chart
    const filteredPie = pieExpenses.filter((exp) => {
        if (pieStart && exp.createdAt < pieStart) return false;
        if (pieEnd && exp.createdAt > pieEnd) return false;
        return true;
    });

    // Fix: Ensure consistent category naming
    const pieData = ALL_CATEGORIES.map(category => {
        const total = filteredPie
            .filter(exp => (exp.category || "Other") === category)
            .reduce((sum, exp) => sum + Number(exp.amount), 0);
        
        return {
            name: category,
            value: total,
            icon: categoryIcons[category] || categoryIcons.Other
        };
    }).filter(item => item.value > 0);

    // Filtered Line Chart - show individual transactions
    const filteredLine = lineExpenses.filter((exp) => {
        if (lineStart && exp.createdAt < lineStart) return false;
        if (lineEnd && exp.createdAt > lineEnd) return false; // FIXED: Changed pieEnd to lineEnd
        if (lineCategory && exp.category !== lineCategory) return false;
        return true;
    });

    // Function to aggregate line chart data when too many points
    const aggregateLineData = (data, threshold = 15) => {
        // If data points are below threshold, return original data
        if (data.length <= threshold) {
            return data;
        }
        
        // Calculate the date range
        const dates = data.map(d => d.fullDate);
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const rangeInDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        
        // Determine aggregation interval based on date range
        let interval;
        if (rangeInDays <= 31) {
            interval = 'day'; // Aggregate by day for up to a month
        } else if (rangeInDays <= 365) {
            interval = 'month'; // Aggregate by month for up to a year
        } else {
            interval = 'year'; // Aggregate by year for longer ranges
        }
        
        // Group data by interval
        const aggregatedData = {};
        
        data.forEach(item => {
            let key;
            const date = item.fullDate;
            
            if (interval === 'day') {
                key = date.toDateString(); // Unique by day
            } else if (interval === 'month') {
                // Use month and year as key
                key = `${date.getFullYear()}-${date.getMonth()}`;
            } else {
                key = `${date.getFullYear()}`; // Year only
            }
            
            if (!aggregatedData[key]) {
                let displayDate;
                if (interval === 'day') {
                    displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (interval === 'month') {
                    displayDate = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                } else {
                    displayDate = date.getFullYear().toString();
                }
                
                aggregatedData[key] = {
                    date: displayDate,
                    fullDate: date,
                    amount: 0,
                    count: 0,
                    categories: new Set(),
                    isAggregated: true
                };
            }
            
            aggregatedData[key].amount += item.amount;
            aggregatedData[key].count += 1;
            aggregatedData[key].categories.add(item.category);
        });
        
        // Convert to array and calculate average
        const result = Object.values(aggregatedData).map(item => ({
            ...item,
            amount: item.amount, // Keep total amount for aggregated data
            categories: Array.from(item.categories),
            // For display in tooltip and details panel
            name: `${item.count} transaction${item.count > 1 ? 's' : ''}`,
            category: item.categories.size > 1 
                ? 'Multiple categories' 
                : Array.from(item.categories)[0]
        }));
        
        // Sort by date
        return result.sort((a, b) => a.fullDate - b.fullDate);
    };

    // Format line data with individual transactions or aggregated data
    const rawLineData = filteredLine
        .map((exp) => ({
            date: exp.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            fullDate: exp.createdAt,
            name: exp.name,
            amount: Number(exp.amount),
            category: exp.category,
            icon: categoryIcons[exp.category] || categoryIcons.Other,
            id: exp.id,
            isAggregated: false
        }))
        .sort((a, b) => a.fullDate - b.fullDate);

    const lineData = aggregateLineData(rawLineData);

    // Calculate total amount for summary
    const totalAmount = filteredLine.reduce((sum, exp) => sum + Number(exp.amount), 0);

    // Check if any filters are applied
    const hasFilters = lineStart || lineEnd || lineCategory;

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pieDateRef.current && !pieDateRef.current.contains(e.target))
                setShowPieDatePicker(false);
            if (lineDateRef.current && !lineDateRef.current.contains(e.target))
                setShowLineDatePicker(false);
            if (lineCategoryRef.current && !lineCategoryRef.current.contains(e.target))
                setShowLineCategory(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle click on line chart point
    const handleLineClick = (data) => {
        if (data && data.activePayload && data.activePayload[0]) {
            setSelectedTransaction(data.activePayload[0].payload);
        }
    };

    // Custom shape for line chart points to make them more clickable
    const CustomizedDot = (props) => {
        const { cx, cy, payload } = props;

        return (
            <g>
                <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth={1}
                    onClick={() => setSelectedTransaction(payload)}
                    style={{ cursor: 'pointer', outline: 'none' }}
                />
            </g>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Navbar */}
            <Navbar />

            <div className="p-4 md:p-6 space-y-6 flex-grow">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : pieExpenses.length === 0 ? (
                    <div className="text-center py-12 bg-gray-800/50 rounded-xl">
                        <p className="text-gray-400 text-lg">No spending data available</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Add some expenses to see analytics
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Pie Chart Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex-1 bg-gray-800/70 p-4 rounded-2xl shadow-lg"
                        >
                            <h2 className="text-xl font-semibold mb-4">Spending Distribution</h2>

                            {/* Filters positioned above chart - UPDATED STYLING */}
                            <div className="flex flex-wrap gap-4 mb-4 items-center" ref={pieDateRef}>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowPieDatePicker((prev) => !prev)}
                                        className="flex items-center justify-between gap-2 w-52 px-4 py-2 bg-gray-600 
                                               hover:bg-gray-700 rounded-lg cursor-pointer text-white 
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <span className="truncate">
                                            <DateRangeDisplay start={pieStart} end={pieEnd} />
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${showPieDatePicker ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <AnimatePresence>
                                        {showPieDatePicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute z-50 mt-2 bg-gray-900/70 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg"
                                            >
                                                <DatePicker
                                                    selected={pieStart}
                                                    onChange={(dates) => {
                                                        const [start, end] = dates;
                                                        setPieStart(start);
                                                        setPieEnd(end);
                                                        if (start && end) setShowPieDatePicker(false);
                                                    }}
                                                    startDate={pieStart}
                                                    endDate={pieEnd}
                                                    selectsRange
                                                    inline
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button
                                    onClick={() => {
                                        setPieStart(null);
                                        setPieEnd(null);
                                    }}
                                    className="px-4 py-2 w-52 bg-blue-700 hover:bg-blue-900 rounded-lg text-white cursor-pointer 
                                           transition focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    Reset Pie Chart Filter
                                </button>
                            </div>

                            {filteredPie.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-gray-400">
                                    No data for selected date range
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={300} className="outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
                                        <PieChart className="outline-none">
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={isMobile ? 100 : 100}
                                                dataKey="value"
                                                labelLine={false}
                                                label={(props) => <RenderCustomizedLabel {...props} />}
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={CATEGORY_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `₹${value}`} />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Color-coded category legend (ALWAYS SHOW ALL CATEGORIES) */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                                        {ALL_CATEGORIES.map((category) => (
                                            <div key={category} className="flex items-center">
                                                <div
                                                    className="w-4 h-4 rounded-sm mr-2"
                                                    style={{ backgroundColor: CATEGORY_COLORS[category] }}
                                                ></div>
                                                <span className="text-sm text-gray-300">{category}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>

                        {/* Line Chart Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex-1 bg-gray-800/70 p-4 rounded-2xl shadow-lg"
                        >
                            <h2 className="text-xl font-semibold mb-4">Spending Over Time</h2>

                            {/* Filters positioned above chart - UPDATED STYLING */}
                            <div className="flex flex-wrap gap-4 mb-4 items-center">
                                {/* Date Picker */}
                                <div className="relative" ref={lineDateRef}>
                                    <button
                                        onClick={() => setShowLineDatePicker((prev) => !prev)}
                                        className="flex items-center justify-between gap-2 w-52 px-4 py-2 bg-gray-600 
                                               hover:bg-gray-700 rounded-lg cursor-pointer text-white 
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <span className="truncate">
                                            <DateRangeDisplay start={lineStart} end={lineEnd} />
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${showLineDatePicker ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <AnimatePresence>
                                        {showLineDatePicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute z-50 mt-2 bg-gray-900/70 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-lg"
                                            >
                                                <DatePicker
                                                    selected={lineStart}
                                                    onChange={(dates) => {
                                                        const [start, end] = dates;
                                                        setLineStart(start);
                                                        setLineEnd(end);
                                                        if (start && end) setShowLineDatePicker(false);
                                                    }}
                                                    startDate={lineStart}
                                                    endDate={lineEnd}
                                                    selectsRange
                                                    inline
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Category Picker */}
                                <div className="relative" ref={lineCategoryRef} >
                                    <button
                                        onClick={() => setShowLineCategory((prev) => !prev)}
                                        className="flex items-center justify-between gap-2 w-52 px-4 py-2 bg-gray-600 
                                               hover:bg-gray-700 rounded-lg cursor-pointer text-white 
                                               focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <span className="truncate">
                                            {lineCategory ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-5 h-5 flex items-center justify-center">
                                                        {categoryIcons[lineCategory] || categoryIcons.Other}
                                                    </span>
                                                    {lineCategory}
                                                </span>
                                            ) : "All Categories"}
                                        </span>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${showLineCategory ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    <AnimatePresence>
                                        {showLineCategory && (
                                            <motion.ul
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute left-0 mt-2 w-52 p-2 rounded-xl shadow-lg z-50 bg-gray-900/70 backdrop-blur-md border border-white/10"
                                            >
                                                <li
                                                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-white/90 hover:bg-gray-800/60 transition"
                                                    onClick={() => {
                                                        setLineCategory("");
                                                        setShowLineCategory(false);
                                                    }}
                                                >
                                                    <span className="w-5 h-5 flex items-center justify-center">📊</span>
                                                    All Categories
                                                </li>
                                                {Object.keys(categoryIcons).map((c) => (
                                                    <li
                                                        key={c}
                                                        className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-white/90 hover:bg-gray-900/60 transition"
                                                        onClick={() => {
                                                            setLineCategory(c);
                                                            setShowLineCategory(false);
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

                                {/* Reset Button */}
                                <button
                                    onClick={() => {
                                        setLineStart(null);
                                        setLineEnd(null);
                                        setLineCategory("");
                                        setSelectedTransaction(null);
                                    }}
                                    className="px-4 py-2 w-52 bg-blue-700 hover:bg-blue-900 rounded-lg text-white cursor-pointer 
                                           transition focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    Reset Line Chart Filters
                                </button>
                            </div>
                            {filteredLine.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-gray-400">
                                    No data for selected filters
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={300} className="outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none">
                                        <LineChart
                                            data={lineData}
                                            margin={{ top: 20, right: 10, left: -27, bottom: 10 }}
                                            onClick={handleLineClick}
                                            className="outline-none"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                                            <XAxis
                                                dataKey="date"
                                                stroke="#ccc"
                                                angle={isMobile ? -45 : 0}
                                                textAnchor={isMobile ? "end" : "middle"}
                                                height={isMobile ? 60 : 40}
                                                interval={isMobile ? "preserveStartEnd" : 0}
                                            />
                                            <YAxis stroke="#ccc" />
                                            {/* Disable default tooltip */}
                                            <Tooltip content={<CustomTooltip chartType="line" />} />
                                            <Line
                                                type="monotone"
                                                dataKey="amount"
                                                name=""
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                dot={<CustomizedDot />}
                                                activeDot={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>

                                    {/* Transaction details panel - always visible */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 p-4 bg-gray-600/50 rounded-lg"
                                    >
                                        <h3 className="font-semibold text-lg mb-3">Transaction Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Column 1 */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col md:flex-row md:items-center gap-1">
                                                    <span className="text-gray-400">Name:</span>
                                                    <span className="font-medium">{selectedTransaction ? selectedTransaction.name : (hasFilters ? "Filtered Items" : "All Items")}</span>
                                                </div>

                                                <div className="flex flex-col md:flex-row md:items-center gap-1">
                                                    <span className="text-gray-400">Category:</span>
                                                    <span className="font-medium">{selectedTransaction ? selectedTransaction.category : (hasFilters ? (lineCategory || "Multiple") : "All Categories")}</span>
                                                </div>
                                            </div>

                                            {/* Column 2 */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col md:flex-row md:items-center gap-1">
                                                    <span className="text-gray-400">Amount:</span>
                                                    <span className="font-medium">₹{selectedTransaction ? selectedTransaction.amount : totalAmount.toFixed(2)}</span>
                                                </div>

                                                <div className="flex flex-col md:flex-row md:items-center gap-1">
                                                    <span className="text-gray-400">Date:</span>
                                                    <span className="font-medium">{selectedTransaction ? selectedTransaction.date : (hasFilters ? <DateRangeDisplay start={lineStart} end={lineEnd} /> : "All Time")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )
                }
            </div >

            {/* Footer */}
            < footer className="w-full py-6 bg-gray-900 text-center mt-auto" >
                <p className="text-gray-500 text-sm">
                    &copy; 2025 SimplyFin.<br />
                    Developer&apos;s Credit: <span className="font-semibold">Saksham Verma</span>.<br />
                    All rights reserved.
                </p>
            </footer >
        </div >
    );
}