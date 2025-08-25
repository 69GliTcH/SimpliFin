"use client";

export default function StatsCard({ title, value, subtitle }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
            <h3 className="text-gray-400 text-sm font-semibold">{title}</h3>
            <div className="mt-2 text-2xl font-bold">{value}</div>
            {subtitle && <div className="mt-1 text-gray-400 text-sm">{subtitle}</div>}
        </div>
    );
}
