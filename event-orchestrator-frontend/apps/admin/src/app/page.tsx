import { Users, Store, DollarSign, Activity } from "lucide-react";

const stats = [
  { name: "Total Revenue", value: "$45,231.89", icon: DollarSign, change: "+20.1%", changeType: "positive" },
  { name: "Active Vendors", value: "2,345", icon: Store, change: "+180.1%", changeType: "positive" },
  { name: "Registered Users", value: "12,345", icon: Users, change: "+19%", changeType: "positive" },
  { name: "Active Events", value: "573", icon: Activity, change: "+201 since last hour", changeType: "positive" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
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
            <p className="text-sm text-muted-foreground">Monthly revenue breakdown.</p>
          </div>
          <div className="p-6 pt-0 pl-2">
            <div className="h-[350px] w-full flex items-center justify-center bg-gray-100 rounded-md">
              <span className="text-gray-500">Chart Placeholder (Recharts)</span>
            </div>
          </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-col space-y-1.5">
            <h3 className="font-semibold leading-none tracking-tight">Recent Sales</h3>
            <p className="text-sm text-muted-foreground">You made 265 sales this month.</p>
          </div>
          <div className="p-6 pt-0">
            <div className="space-y-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs font-medium">OM</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">Olivia Martin</p>
                    <p className="text-sm text-muted-foreground">olivia.martin@email.com</p>
                  </div>
                  <div className="ml-auto font-medium">+$1,999.00</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
