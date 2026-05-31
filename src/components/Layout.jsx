import { Link, useLocation, Outlet } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, CalendarDays, Clock, Users, Truck,
  UserCheck, BarChart2, Mail, Package, ShoppingCart, ChevronDown,
  ChevronRight, Menu, X, PlusCircle, Star, MessageSquare, Calendar,
  Trophy, DollarSign, Award as AwardIcon, Timer, Bell, MapPin
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const navGroups = [
  {
    group: "Operations",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Bookings", icon: BookOpen, path: "/bookings" },
      { label: "Calendar View", icon: CalendarDays, path: "/calendars" },
      { label: "Diary", icon: CalendarDays, path: "/diary" },
    ]
  },
  {
    group: "Resources",
    items: [
      { label: "Agents Report", icon: BarChart2, path: "/agents-report" },
      { label: "Customer Feedback", icon: Star, path: "/feedback" },
    ]
  },
  {
    group: "Time & Availability",
    items: [
      { label: "Mover Availability", icon: Calendar, path: "/mover-availability" },
    ]
  },
  {
    group: "Administration",
    items: [
      { label: "Email Templates", icon: Mail, path: "/email-templates" },
      { label: "Inventory List", icon: Package, path: "/inventory" },
      { label: "Supply List", icon: ShoppingCart, path: "/supplies" },
      { label: "Bulk SMS Tool", icon: MessageSquare, path: "/bulk-sms" },
      { label: "Packaging Orders", icon: ShoppingCart, path: "/packaging-orders" },
      { label: "Inventory Checklists", icon: Package, path: "/inventory-checklists" },
    ]
  },
  {
    group: "Scheduling",
    items: [
      { label: "Mover Scheduling", icon: Calendar, path: "/scheduling" },
      { label: "Truck Tracking", icon: Truck, path: "/truck-tracking" },
      { label: "Time Clock", icon: Clock, path: "/time-clock" },
    ]
  },
  {
    group: "Analytics",
    items: [
      { label: "Mover Performance", icon: Trophy, path: "/mover-performance" },
      { label: "Driver Performance", icon: AwardIcon, path: "/driver-performance" },
      { label: "Schedule Monitoring", icon: Timer, path: "/schedule-monitoring" },
      { label: "Payroll", icon: DollarSign, path: "/payroll" },
    ]
  },
  {
    group: "Portals",
    items: [
      { label: "Agent & Mover Portal", icon: UserCheck, path: "/agent-portal" },
      { label: "Customer Portal", icon: Users, path: "/customer" },
      { label: "Notification Monitoring", icon: Bell, path: "/notification-monitoring" },
      { label: "AI Quote Engine", icon: DollarSign, path: "/bookings" },
      { label: "Driver Portal", icon: Truck, path: "/driver-portal" },
      { label: "Live Truck Map", icon: MapPin, path: "/live-truck-map" },
    ]
  },
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
          {navGroups.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="text-gray-500 text-xs px-4 py-2 uppercase tracking-wider font-semibold">{group.group}</p>
              {group.items.map((item) => {
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
            </div>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Link to="/bookings/new" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                <PlusCircle size={16} /> New Booking
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{user?.full_name || "Admin"}</span>
            <button
              onClick={() => base44.auth.logout()}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}