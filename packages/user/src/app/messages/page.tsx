"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="flex items-center mb-6">
                <MessageSquare className="h-6 w-6 mr-2 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
                <p className="text-gray-500">Your conversations will appear here.</p>
                {/* Integration with backend /api/v1/messages will go here */}
            </div>
        </div>
    );
}
