"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Store, DollarSign, Activity, AlertCircle } from "lucide-react";
import { getStats, getVendors } from "@/lib/api";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated (in useEffect to avoid setState during render)
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
  });

  const { data: recentVendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ["recentVendors"],
    queryFn: getVendors,
  });

  if (status === "loading" || status === "unauthenticated" || statsLoading || vendorsLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (statsError) {
    return (
      <div className="p-8 text-red-500 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Failed to load dashboard data. Is the backend running?
      </div>
    );
  }

  const statCards = [
    {
      name: "Total Revenue",
      value: `PKR ${(stats?.revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      change: "Lifetime",
      changeType: "neutral"
    },
    {
      name: "Active Vendors",
      value: stats?.activeVendors || 0,
      icon: Store,
      change: "Verified vendors",
      changeType: "positive"
    },
    {
      name: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: "Vendor accounts",
      changeType: "positive"
    },
    {
      name: "Active Events",
      value: stats?.activeEvents || 0,
      icon: Activity,
      change: "In progress",
      changeType: "positive"
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground">{stat.name}</h3>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-col space-y-1.5">
            <h3 className="font-semibold leading-none tracking-tight">Overview</h3>
            <p className="text-sm text-muted-foreground">System activity summary.</p>
          </div>
          <div className="p-6 pt-0 pl-2">
            <div className="h-[350px] w-full flex items-center justify-center bg-gray-100 rounded-md">
              <span className="text-gray-500">Real-time charts coming soon...</span>
            </div>
          </div>
        </div>

        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-col space-y-1.5">
            <h3 className="font-semibold leading-none tracking-tight">Recent Vendors</h3>
            <p className="text-sm text-muted-foreground">Recently registered vendors.</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-8">
              {recentVendors?.slice(0, 5).map((vendor: any) => (
                <div key={vendor.id} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="text-xs font-medium">{vendor.name.substring(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{vendor.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{vendor.category}</p>
                  </div>
                  <div className={`ml-auto font-medium text-sm ${vendor.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {vendor.status}
                  </div>
                </div>
              ))}
              {(!recentVendors || recentVendors.length === 0) && (
                <div className="text-sm text-muted-foreground text-center py-4">No vendors found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
