import { Link, useLocation, Outlet } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, CalendarDays, Clock, Users, Truck,
  UserCheck, BarChart2, Mail, Package, ShoppingCart, ChevronDown,
  ChevronRight, Menu, X
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Bookings", icon: BookOpen, path: "/bookings" },
  { label: "Diary", icon: CalendarDays, path: "/diary" },
  { label: "Calendars", icon: CalendarDays, path: "/calendars" },
  { label: "Mover Availability", icon: UserCheck, path: "/mover-availability" },
  { label: "Manual Time Log", icon: Clock, path: "/time-log" },
  { label: "Hours Worked", icon: Clock, path: "/hours-worked" },
  { label: "User Management", icon: Users, path: "/users" },
  { label: "Agents Report", icon: BarChart2, path: "/agents-report" },
  { label: "Trucks Management", icon: Truck, path: "/trucks" },
  { label: "Customer Management", icon: Users, path: "/customers" },
  { label: "Inventory List", icon: Package, path: "/inventory" },
  { label: "Supply List", icon: ShoppingCart, path: "/supplies" },
];

export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-56" : "w-0 overflow-hidden"} transition-all duration-300 bg-gray-800 flex flex-col flex-shrink-0`}>
        {/* Logo */}
        <div className="bg-blue-600 px-4 py-3">
          <span className="text-white font-bold text-sm uppercase tracking-wide">Move On Australia</span>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {user?.full_name?.[0] || "A"}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name || "Admin"}</p>
            <p className="text-green-400 text-xs">● Online</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <p className="text-gray-500 text-xs px-4 py-2 uppercase tracking-wider">Main Navigation</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <item.icon size={16} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-blue-700 rounded">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span>{user?.full_name || "Admin"}</span>
            <button
              onClick={() => base44.auth.logout()}
              className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}