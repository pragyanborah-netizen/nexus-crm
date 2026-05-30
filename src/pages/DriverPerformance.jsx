import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from "recharts";
import { 
  TrendingUp, Star, Clock, CheckCircle, Users, Award, 
  Calendar, Target, Truck, MapPin
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const StatCard = ({ icon: Icon, label, value, sublabel, color, trend }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
  </div>
);

export default function DriverPerformance() {
  const [timeRange, setTimeRange] = useState("30");
  const [selectedDriver, setSelectedDriver] = useState("all");

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings-performance"],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ["surveys-performance"],
    queryFn: () => base44.entities.Survey.list(),
  });

  const { data: timeLogs = [], isLoading: timeLogsLoading } = useQuery({
    queryKey: ["timelogs-performance"],
    queryFn: () => base44.entities.TimeLog.list(),
  });

  const { data: timeClocks = [], isLoading: timeClocksLoading } = useQuery({
    queryKey: ["timeclocks-performance"],
    queryFn: () => base44.entities.TimeClock.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  // Calculate driver metrics
  const driverMetrics = (() => {
    const metrics = {};
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

    // Process bookings
    bookings.forEach(booking => {
      if (booking.status !== "Completed") return;
      const moveDate = new Date(booking.move_date);
      if (moveDate < daysAgo) return;

      const movers = [
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted
      ].filter(Boolean);

      movers.forEach(mover => {
        if (!metrics[mover]) {
          metrics[mover] = {
            name: mover,
            jobsCompleted: 0,
            totalRevenue: 0,
            ratings: [],
            totalHours: 0,
            onTimeCount: 0,
            totalJobs: 0,
          };
        }
        metrics[mover].jobsCompleted++;
        metrics[mover].totalRevenue += booking.price || 0;
        metrics[mover].totalJobs++;
        
        // Check on-time (assuming move_time is scheduled time)
        if (booking.move_time) {
          metrics[mover].onTimeCount++;
        }
      });
    });

    // Process surveys
    surveys.forEach(survey => {
      const surveyDate = new Date(survey.survey_submitted_date || survey.created_date);
      if (surveyDate < daysAgo) return;

      const booking = bookings.find(b => b.id === survey.booking_id);
      if (!booking) return;

      const movers = [
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted
      ].filter(Boolean);

      movers.forEach(mover => {
        if (metrics[mover] && survey.overall_rating) {
          metrics[mover].ratings.push(survey.overall_rating);
        }
      });
    });

    // Process time logs
    timeLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate < daysAgo) return;

      if (metrics[log.employee_name]) {
        metrics[log.employee_name].totalHours += log.hours_worked || 0;
      }
    });

    // Calculate averages and rates
    Object.keys(metrics).forEach(mover => {
      const m = metrics[mover];
      m.avgRating = m.ratings.length > 0
        ? (m.ratings.reduce((a, b) => a + b, 0) / m.ratings.length).toFixed(1)
        : "N/A";
      m.totalReviews = m.ratings.length;
      m.onTimeRate = m.totalJobs > 0
        ? ((m.onTimeCount / m.totalJobs) * 100).toFixed(0)
        : "N/A";
    });

    return Object.values(metrics);
  })();

  // Get team averages
  const teamAverages = (() => {
    if (driverMetrics.length === 0) return null;
    
    const validRatings = driverMetrics
      .filter(m => m.avgRating !== "N/A")
      .map(m => parseFloat(m.avgRating));
    
    const validOnTime = driverMetrics
      .filter(m => m.onTimeRate !== "N/A")
      .map(m => parseFloat(m.onTimeRate));

    return {
      avgJobs: driverMetrics.reduce((sum, m) => sum + m.jobsCompleted, 0) / driverMetrics.length,
      avgRating: validRatings.length > 0 
        ? (validRatings.reduce((a, b) => a + b, 0) / validRatings.length).toFixed(1)
        : "N/A",
      avgHours: driverMetrics.reduce((sum, m) => sum + m.totalHours, 0) / driverMetrics.length,
      avgOnTime: validOnTime.length > 0
        ? (validOnTime.reduce((a, b) => a + b, 0) / validOnTime.length).toFixed(0)
        : "N/A",
    };
  })();

  // Filter for selected driver or show all
  const filteredMetrics = selectedDriver === "all" 
    ? driverMetrics 
    : driverMetrics.filter(m => m.name === selectedDriver);

  // Performance over time (last 30 days)
  const performanceOverTime = (() => {
    const data = [];
    const days = Math.min(parseInt(timeRange), 30);
    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });

      const dayBookings = bookings.filter(b => {
        if (b.status !== "Completed") return false;
        const moveDate = new Date(b.move_date);
        return moveDate.toDateString() === date.toDateString();
      });

      const dayJobs = dayBookings.length;
      const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.price || 0), 0);

      // Calculate average rating for the day
      const daySurveys = surveys.filter(s => {
        const surveyDate = new Date(s.survey_submitted_date || s.created_date);
        return surveyDate.toDateString() === date.toDateString();
      });
      const avgRating = daySurveys.length > 0
        ? daySurveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / daySurveys.length
        : 0;

      data.push({
        date: dateStr,
        jobs: dayJobs,
        revenue: Math.round(dayRevenue),
        rating: avgRating > 0 ? avgRating.toFixed(1) : 0,
      });
    }

    return data;
  })();

  // Driver comparison data
  const comparisonData = driverMetrics.map(m => ({
    name: m.name.split(" ")[0] || m.name,
    jobs: m.jobsCompleted,
    rating: parseFloat(m.avgRating) || 0,
    hours: m.totalHours,
    onTime: parseFloat(m.onTimeRate) || 0,
  }));

  const totalJobs = driverMetrics.reduce((sum, m) => sum + m.jobsCompleted, 0);
  const avgRating = teamAverages?.avgRating || "N/A";
  const totalHours = driverMetrics.reduce((sum, m) => sum + m.totalHours, 0);
  const avgOnTime = teamAverages?.avgOnTime || "N/A";

  // Get current driver's data if logged in
  const currentDriverData = currentUser 
    ? driverMetrics.find(m => m.name === currentUser.full_name || m.name === currentUser.email)
    : null;

  const displayData = currentDriverData || (driverMetrics[0] || {});

  if (bookingsLoading || surveysLoading || timeLogsLoading || timeClocksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Driver Performance Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Track individual and team performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
          >
            <option value="all">All Drivers</option>
            {driverMetrics.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Truck}
          label="Total Jobs Completed"
          value={totalJobs}
          sublabel={selectedDriver === "all" ? "All drivers" : `Team avg: ${teamAverages?.avgJobs.toFixed(1)}`}
          color="bg-blue-500"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={avgRating !== "N/A" ? `${avgRating}★` : "N/A"}
          sublabel={`${surveys.length} total reviews`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={Clock}
          label="Total Hours Logged"
          value={totalHours.toFixed(1)}
          sublabel={selectedDriver === "all" ? "All drivers" : `Team avg: ${teamAverages?.avgHours.toFixed(1)}`}
          color="bg-purple-500"
        />
        <StatCard
          icon={CheckCircle}
          label="On-Time Arrival Rate"
          value={avgOnTime !== "N/A" ? `${avgOnTime}%` : "N/A"}
          sublabel="Team average"
          color="bg-green-500"
        />
      </div>

      {/* Individual Driver Stats */}
      {currentDriverData && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Award size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Your Performance</h2>
                <p className="text-sm text-blue-100">{currentDriverData.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{currentDriverData.avgRating !== "N/A" ? `${currentDriverData.avgRating}★` : "N/A"}</p>
              <p className="text-xs text-blue-100">Average Rating</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{currentDriverData.jobsCompleted}</p>
              <p className="text-xs text-blue-100">Jobs Done</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentDriverData.totalHours.toFixed(1)}</p>
              <p className="text-xs text-blue-100">Hours Worked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{currentDriverData.onTimeRate !== "N/A" ? `${currentDriverData.onTimeRate}%` : "N/A"}</p>
              <p className="text-xs text-blue-100">On-Time Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">${(currentDriverData.totalRevenue / 1000).toFixed(1)}k</p>
              <p className="text-xs text-blue-100">Revenue Generated</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            Jobs Completed Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
              <Area type="monotone" dataKey="jobs" stroke="#3b82f6" fill="#eff6ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-600" />
            Daily Ratings Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} domain={[0, 5]} />
              <Tooltip 
                contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                formatter={(value) => [`${value}★`, "Average Rating"]}
              />
              <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Driver Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-600" />
          Driver Comparison - Jobs Completed
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
            <Legend />
            <Bar dataKey="jobs" fill="#3b82f6" name="Jobs Completed" />
            <Bar dataKey="onTime" fill="#10b981" name="On-Time Rate %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rating Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Award size={18} className="text-yellow-600" />
          Team Performance Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Average Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={driverMetrics.map(m => ({
                    name: m.name.split(" ")[0] || m.name,
                    value: parseFloat(m.avgRating) || 0,
                  })).filter(d => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.name}: ${entry.value}★`}
                >
                  {driverMetrics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Hours Worked by Driver</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Bar dataKey="hours" fill="#8b5cf6" name="Hours Worked" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            Detailed Performance Metrics
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Driver</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Jobs</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Avg Rating</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">Hours</th>
                <th className="text-center px-6 py-3 font-medium text-gray-600">On-Time %</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {filteredMetrics.map((driver) => (
                <tr key={driver.name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <MapPin size={16} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.totalReviews} reviews</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="font-medium text-gray-700">{driver.jobsCompleted}</span>
                  </td>
                  <td className="text-center">
                    {driver.avgRating !== "N/A" ? (
                      <span className="font-semibold text-yellow-600">{driver.avgRating}★</span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="text-gray-600">{driver.totalHours.toFixed(1)}</span>
                  </td>
                  <td className="text-center">
                    {driver.onTimeRate !== "N/A" ? (
                      <span className={`font-medium ${
                        parseFloat(driver.onTimeRate) >= 90 ? "text-green-600" :
                        parseFloat(driver.onTimeRate) >= 75 ? "text-yellow-600" :
                        "text-red-600"
                      }`}>
                        {driver.onTimeRate}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="text-right">
                    <span className="font-semibold text-green-600">${driver.totalRevenue.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredMetrics.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Target size={40} className="mx-auto mb-3 opacity-50" />
            <p>No performance data available for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}