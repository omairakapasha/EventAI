"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    Calendar,
    Users,
    DollarSign,
    Package,
    Plus,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import { getUserEvents, getUserBookings } from "@/lib/api";

const stats = [
    { label: "My Events", value: "3", icon: Calendar, color: "bg-blue-100 text-blue-600" },
    { label: "Bookings", value: "5", icon: Package, color: "bg-green-100 text-green-600" },
    { label: "Total Spent", value: "PKR 125,000", icon: DollarSign, color: "bg-yellow-100 text-yellow-600" },
    { label: "Vendors Contacted", value: "8", icon: Users, color: "bg-purple-100 text-purple-600" },
];

const quickActions = [
    { label: "Create Event", href: "/create-event", icon: Plus, color: "bg-blue-600" },
    { label: "Find Vendors", href: "/marketplace", icon: Sparkles, color: "bg-purple-600" },
    { label: "View Bookings", href: "/bookings", icon: Package, color: "bg-green-600" },
];

export default function DashboardPage() {
    const { data: events, isLoading: eventsLoading } = useQuery({
        queryKey: ["events"],
        queryFn: getUserEvents,
    });

    const { data: bookings, isLoading: bookingsLoading } = useQuery({
        queryKey: ["bookings"],
        queryFn: getUserBookings,
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                    <p className="mt-2 text-gray-600">
                        Manage your events, bookings, and vendor communications.
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className={`flex items-center gap-3 rounded-lg ${action.color} px-6 py-4 text-white transition-opacity hover:opacity-90`}
                        >
                            <action.icon className="h-5 w-5" />
                            <span className="font-medium">{action.label}</span>
                            <ArrowRight className="ml-auto h-4 w-4" />
                        </Link>
                    ))}
                </div>

                {/* Stats */}
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-lg bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Events */}
                <div className="mb-8 rounded-lg bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">My Events</h2>
                    </div>
                    <div className="p-6">
                        {eventsLoading ? (
                            <p className="text-gray-500">Loading events...</p>
                        ) : events?.events?.length ? (
                            <div className="space-y-4">
                                {events.events.slice(0, 3).map((event: any) => (
                                    <div
                                        key={event.id}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                                    >
                                        <div>
                                            <h3 className="font-medium text-gray-900">
                                                {event.eventName || event.eventType}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {new Date(event.eventDate).toLocaleDateString()} • {event.location}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                event.status === "confirmed"
                                                    ? "bg-green-100 text-green-800"
                                                    : event.status === "planning"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {event.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500 mb-4">No events yet</p>
                                <Link
                                    href="/create-event"
                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create your first event
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Bookings */}
                <div className="rounded-lg bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                    </div>
                    <div className="p-6">
                        {bookingsLoading ? (
                            <p className="text-gray-500">Loading bookings...</p>
                        ) : bookings?.bookings?.length ? (
                            <div className="space-y-4">
                                {bookings.bookings.slice(0, 3).map((booking: any) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                                    >
                                        <div>
                                            <h3 className="font-medium text-gray-900">
                                                {booking.service?.name}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {booking.vendor?.name} • {new Date(booking.eventDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                booking.status === "confirmed"
                                                    ? "bg-green-100 text-green-800"
                                                    : booking.status === "pending"
                                                    ? "bg-yellow-100 text-yellow-800"
                                                    : "bg-gray-100 text-gray-800"
                                            }`}
                                        >
                                            {booking.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No bookings yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
