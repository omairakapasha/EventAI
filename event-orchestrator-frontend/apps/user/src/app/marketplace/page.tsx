"use client";

import { useQuery } from "@tanstack/react-query";
import { getVendors } from "@/lib/api";
import { Star, MapPin, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export default function MarketplacePage() {
    const { data: vendors, isLoading } = useQuery({
        queryKey: ["vendors"],
        queryFn: getVendors,
    });

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Vendor Marketplace</h1>
                <div className="mt-4 sm:mt-0">
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {vendors?.map((vendor: any) => (
                    <div key={vendor.id} className="group relative bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-w-3 aspect-h-2 bg-gray-200 group-hover:opacity-75 h-48 overflow-hidden">
                            <img
                                src={vendor.image}
                                alt={vendor.name}
                                className="h-full w-full object-cover object-center"
                            />
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        <a href="#">
                                            <span aria-hidden="true" className="absolute inset-0" />
                                            {vendor.name}
                                        </a>
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">{vendor.category}</p>
                                </div>
                                <p className="text-sm font-medium text-gray-900">{vendor.price}</p>
                            </div>
                            <div className="mt-2 flex items-center">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="ml-1 text-sm text-gray-500">{vendor.rating}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
