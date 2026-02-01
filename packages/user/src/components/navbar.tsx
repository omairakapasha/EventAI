"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Plus, Store, MessageSquare, User } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

const navigation = [
    { name: "My Events", href: "/", icon: Calendar },
    { name: "Create Event", href: "/create-event", icon: Plus },
    { name: "Marketplace", href: "/marketplace", icon: Store },
    { name: "Messages", href: "/messages", icon: MessageSquare },
];

export function Navbar() {
    const pathname = usePathname();

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-indigo-600">EventOrchestrator</span>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                                            isActive
                                                ? "border-indigo-500 text-gray-900"
                                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        )}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="hidden sm:ml-6 sm:flex sm:items-center">
                        <button className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            <span className="sr-only">View notifications</span>
                            {/* Bell icon would go here */}
                        </button>
                        <div className="ml-3 relative">
                            <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <User className="h-5 w-5 text-gray-500" />
                                </div>
                                <span>User</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
