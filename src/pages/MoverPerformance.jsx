import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Star, TrendingUp, Award, Calendar, CheckCircle } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

const StatCard = ({ icon: Icon, label, value, sublabel, color }) => (
  <div className="bg-white rounded-lg shadow p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      {sublabel && (
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {sublabel}
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-gray-800">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
  </div>
);

export default function MoverPerformance() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings-analytics", timeRange],
    queryFn: () => base44.entities.Booking.list(),
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery({
    queryKey: ["surveys-analytics"],
    queryFn: () => base44.entities.Survey.list(),
  });

  const { data: timeLogs = [], isLoading: timeLogsLoading } = useQuery({
    queryKey: ["timelogs-analytics", timeRange],
    queryFn: () => base44.entities.TimeLog.list(),
  });

  const moverMetrics = (() => {
    const metrics = {};
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange));

    bookings.forEach(booking => {
      if (booking.status !== "Completed") return;
      const moveDate = new Date(booking.move_date);
      if (moveDate < daysAgo) return;

      const movers = [
        booking.agent_booked,
        booking.agent_inquired,
        booking.agent_quoted,
        booking.agent_pending
      ].filter(Boolean);

      movers.forEach(mover => {
        if (!metrics[mover]) {
          metrics[mover] = {
            name: mover,
            jobsCompleted: 0,
            totalRevenue: 0,
            ratings: [],
          };
        }
        metrics[mover].jobsCompleted++;
        metrics[mover].totalRevenue += booking.price || 0;
      });
    });

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

    Object.keys(metrics).forEach(mover => {
      const m = metrics[mover];
      m.avgRating = m.ratings.length > 0
        ? (m.ratings.reduce((a, b) => a + b, 0) / m.ratings.length).toFixed(1)
        : "N/A";
      m.totalReviews = m.ratings.length;
    });

    return Object.values(metrics).sort((a, b) => b.jobsCompleted - a.jobsCompleted);
  })();

  const jobsOverTime = (() => {
    const data = [];
    const days = parseInt(timeRange);
    const today = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });

      const completedCount = bookings.filter(b => {
        if (b.status !== "Completed") return false;
        const moveDate = new Date(b.move_date);
        return moveDate.toDateString() === date.toDateString();
      }).length;

      data.push({ date: dateStr, jobs: completedCount });
    }

    return data;
  })();

  const ratingDistribution = (() => {
    const distribution = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
    surveys.forEach(s => {
      if (s.overall_rating) {
        distribution[s.overall_rating.toString()]++;
      }
    });
    return Object.entries(distribution).map(([rating, count]) => ({
      rating: `${rating} Stars`,
      count,
    }));
  })();

  const totalJobs = moverMetrics.reduce((sum, m) => sum + m.jobsCompleted, 0);
  const avgRating = surveys.length > 0
    ? (surveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / surveys.filter(s => s.overall_rating).length).toFixed(1)
    : "N/A";

  const topPerformers = [...moverMetrics].sort((a, b) => {
    const aScore = a.jobsCompleted * 10 + (parseFloat(a.avgRating) || 0) * 5;
    const bScore = b.jobsCompleted * 10 + (parseFloat(b.avgRating) || 0) * 5;
    return bScore - aScore;
  }).slice(0, 5);

  if (bookingsLoading || surveysLoading || timeLogsLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mover Performance Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track team performance, ratings, and completion metrics</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Active Movers"
          value={moverMetrics.length}
          sublabel={timeRange === "7" ? "This week" : timeRange === "30" ? "This month" : "Last 3 months"}
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Total Jobs Completed"
          value={totalJobs}
          sublabel={`${avgRating !== "N/A" ? `${avgRating}★ avg` : "No ratings"}`}
          color="bg-green-500"
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={avgRating !== "N/A" ? `${avgRating}★` : "N/A"}
          sublabel={`${surveys.length} reviews`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={`$${(moverMetrics.reduce((sum, m) => sum + m.totalRevenue, 0) / 1000).toFixed(1)}k`}
          sublabel="Period total"
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            Jobs Completed Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={jobsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="jobs" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-600" />
            Customer Rating Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={ratingDistribution}
                dataKey="count"
                nameKey="rating"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.rating}: ${entry.count}`}
              >
                {ratingDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Award size={18} className="text-yellow-600" />
            Top Performers
          </h2>
          <p className="text-sm text-gray-500 mt-1">Based on jobs completed and customer ratings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Rank</th>
                <th className="text-left px-6 py-3 font-medium text-gray-600">Mover</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Jobs Completed</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Avg Rating</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Reviews</th>
                <th className="text-right px-6 py-3 font-medium text-gray-600">Revenue Generated</th>
              </tr>
            </thead>
            <tbody>
              {topPerformers.map((mover, idx) => (
                <tr key={mover.name} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {idx === 0 && <span className="text-yellow-500">🥇</span>}
                      {idx === 1 && <span className="text-gray-400">🥈</span>}
                      {idx === 2 && <span className="text-orange-500">🥉</span>}
                      {idx > 2 && <span className="text-gray-400 font-medium">#{idx + 1}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-800">{mover.name}</p>
                      <p className="text-xs text-gray-500">${(mover.totalRevenue / mover.jobsCompleted).toFixed(0)} avg/job</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-800">{mover.jobsCompleted}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {mover.avgRating !== "N/A" ? (
                      <span className="font-semibold text-yellow-600">{mover.avgRating}★</span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-600">{mover.totalReviews}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-green-600">${mover.totalRevenue.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topPerformers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Award size={40} className="mx-auto mb-3 opacity-50" />
            <p>No performance data available for this period</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={18} className="text-blue-600" />
          All Movers Performance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {moverMetrics.map((mover) => (
            <div key={mover.name} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{mover.name}</p>
                    <p className="text-xs text-gray-500">{mover.jobsCompleted} jobs</p>
                  </div>
                </div>
                {mover.avgRating !== "N/A" && (
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-700">{mover.avgRating}</span>
                  </div>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenue:</span>
                  <span className="font-medium text-green-600">${mover.totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reviews:</span>
                  <span className="font-medium text-gray-700">{mover.totalReviews}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg per job:</span>
                  <span className="font-medium text-gray-700">${(mover.totalRevenue / mover.jobsCompleted).toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {moverMetrics.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-50" />
            <p>No mover data available for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}