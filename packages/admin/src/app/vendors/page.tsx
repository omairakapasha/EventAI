"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVendors, updateVendorStatus } from "@/lib/api";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

export default function VendorsPage() {
    const queryClient = useQueryClient();

    const { data: vendors, isLoading } = useQuery({
        queryKey: ["vendors"],
        queryFn: getVendors,
    });

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            updateVendorStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["vendors"] });
        },
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Vendor Management</h1>
            </div>

            <div className="rounded-md border bg-white shadow">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Category</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Rating</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {vendors?.map((vendor: any) => (
                                <tr key={vendor.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle font-medium">{vendor.name}</td>
                                    <td className="p-4 align-middle">{vendor.category}</td>
                                    <td className="p-4 align-middle">
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                vendor.status === "approved"
                                                    ? "bg-green-100 text-green-800"
                                                    : vendor.status === "rejected"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                            )}
                                        >
                                            {vendor.status}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle">{vendor.rating}</td>
                                    <td className="p-4 align-middle text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => mutation.mutate({ id: vendor.id, status: "approved" })}
                                                disabled={vendor.status === "approved" || mutation.isPending}
                                                className="p-2 hover:bg-green-100 rounded-full text-green-600 disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => mutation.mutate({ id: vendor.id, status: "rejected" })}
                                                disabled={vendor.status === "rejected" || mutation.isPending}
                                                className="p-2 hover:bg-red-100 rounded-full text-red-600 disabled:opacity-50"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
