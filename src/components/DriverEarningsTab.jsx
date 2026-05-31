import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, Clock, Star, TrendingUp, CheckCircle, AlertCircle, Package } from "lucide-react";

const DAMAGE_FREE_BONUS = 50;
const DEFAULT_RATE = 25; // $/hr fallback

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function fmt(num) {
  return `$${Number(num || 0).toFixed(2)}`;
}

export default function DriverEarningsTab({ truckName }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const { start, end } = getWeekRange(weekOffset);

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const { data: allBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["driver-earnings-bookings", truckName],
    queryFn: () => base44.entities.Booking.list("-move_date", 200),
    enabled: !!truckName,
  });

  const { data: inventoryChecks = [] } = useQuery({
    queryKey: ["driver-inventory-checks", truckName],
    queryFn: () => base44.entities.DriverInventoryCheck.filter({ truck_name: truckName }),
    enabled: !!truckName,
  });

  const { data: timeLogs = [] } = useQuery({
    queryKey: ["driver-time-logs", truckName],
    queryFn: () => base44.entities.TimeLog.list("-date", 100),
    enabled: !!truckName,
  });

  // Filter bookings for this truck in the selected week
  const weekBookings = allBookings.filter(b => {
    if (!b.move_date || b.move_date < startStr || b.move_date > endStr) return false;
    const name = truckName.toLowerCase();
    return (
      b.truck_assigned?.toLowerCase().includes(name) ||
      b.moving_truck_size?.toLowerCase().includes(name) ||
      b.truck_size?.toLowerCase().includes(name)
    );
  });

  const completedBookings = weekBookings.filter(b => b.status === "Completed");

  // Damage-free checks: submitted check where no items are Damaged or Missing
  const damageFreeBookingIds = new Set(
    inventoryChecks
      .filter(c => {
        if (c.status !== "Submitted") return false;
        const items = c.items || [];
        return items.length > 0 && items.every(i => i.condition === "OK");
      })
      .map(c => c.booking_id)
  );

  // Calculate earnings per booking
  const jobEarnings = weekBookings.map(b => {
    const hours = Number(b.actual_hours || b.estimated_hours || 0);
    const rate = Number(b.moving_rate_per_hour || DEFAULT_RATE);
    // Driver's cut is ~35% of hourly rate (approximation)
    const driverRate = rate * 0.35;
    const jobPay = hours * driverRate;
    const bonus = b.status === "Completed" && damageFreeBookingIds.has(b.id) ? DAMAGE_FREE_BONUS : 0;
    return {
      booking: b,
      hours,
      jobPay,
      bonus,
      total: jobPay + bonus,
      damageFree: damageFreeBookingIds.has(b.id),
    };
  });

  // Time logs for this week (matched by employee if possible — use truck as proxy)
  const weekTimeLogs = timeLogs.filter(t => t.date >= startStr && t.date <= endStr);
  const clockedHours = weekTimeLogs.reduce((s, t) => s + (Number(t.hours_worked) || 0), 0);

  const totalJobPay = jobEarnings.reduce((s, j) => s + j.jobPay, 0);
  const totalBonuses = jobEarnings.reduce((s, j) => s + j.bonus, 0);
  const totalEarnings = totalJobPay + totalBonuses;
  const totalHours = jobEarnings.reduce((s, j) => s + j.hours, 0);
  const completedCount = completedBookings.length;
  const damageFreeCount = jobEarnings.filter(j => j.damageFree && j.bonus > 0).length;

  const weekLabel = weekOffset === 0
    ? "This Week"
    : weekOffset === -1
    ? "Last Week"
    : `${start.toLocaleDateString("en-AU", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Week selector */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekOffset(o => o - 1)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
        >‹ Prev</button>
        <span className="text-white font-bold text-sm">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset(o => Math.min(0, o + 1))}
          disabled={weekOffset >= 0}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm disabled:opacity-30"
        >Next ›</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-4">
          <DollarSign size={20} className="text-green-200 mb-2" />
          <p className="text-green-100 text-xs font-semibold uppercase tracking-wide">Total Earnings</p>
          <p className="text-white text-2xl font-bold mt-0.5">{fmt(totalEarnings)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4">
          <Clock size={20} className="text-blue-200 mb-2" />
          <p className="text-blue-100 text-xs font-semibold uppercase tracking-wide">Hours Worked</p>
          <p className="text-white text-2xl font-bold mt-0.5">
            {clockedHours > 0 ? clockedHours.toFixed(1) : totalHours.toFixed(1)}
            <span className="text-blue-200 text-sm font-normal"> hrs</span>
          </p>
          {clockedHours === 0 && totalHours > 0 && (
            <p className="text-blue-300 text-xs mt-0.5">est. from jobs</p>
          )}
        </div>
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-4 border border-gray-600">
          <CheckCircle size={20} className="text-gray-300 mb-2" />
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Jobs Done</p>
          <p className="text-white text-2xl font-bold mt-0.5">{completedCount}</p>
          <p className="text-gray-400 text-xs">{weekBookings.length} total assigned</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-2xl p-4">
          <Star size={20} className="text-yellow-200 mb-2" />
          <p className="text-yellow-100 text-xs font-semibold uppercase tracking-wide">Damage-Free Bonus</p>
          <p className="text-white text-2xl font-bold mt-0.5">{fmt(totalBonuses)}</p>
          <p className="text-yellow-200 text-xs">{damageFreeCount} × ${DAMAGE_FREE_BONUS}</p>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-400" />
          <h3 className="text-white font-bold text-sm">Job Breakdown</h3>
        </div>

        {loadingBookings ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : weekBookings.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">No jobs this week</div>
        ) : (
          <div className="divide-y divide-gray-700">
            {jobEarnings.map(({ booking: b, hours, jobPay, bonus, total, damageFree }) => (
              <div key={b.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-semibold">
                        {b.customer_first_name} {b.customer_last_name}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === "Completed"
                          ? "bg-green-900/60 text-green-300"
                          : "bg-gray-700 text-gray-400"
                      }`}>
                        {b.status}
                      </span>
                      {damageFree && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/60 text-yellow-300 font-medium flex items-center gap-1">
                          <Star size={10} /> Damage-Free
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {b.move_date} · {hours > 0 ? `${hours} hrs` : "hours TBC"}
                      {b.moving_rate_per_hour ? ` · @$${b.moving_rate_per_hour}/hr` : ""}
                    </p>
                    <div className="flex gap-3 mt-1.5 text-xs">
                      <span className="text-gray-400">Job pay: <span className="text-gray-200">{fmt(jobPay)}</span></span>
                      {bonus > 0 && (
                        <span className="text-yellow-400">Bonus: +{fmt(bonus)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-green-400 font-bold text-base">{fmt(total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals footer */}
        {weekBookings.length > 0 && (
          <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Job Pay</span>
              <span className="text-gray-200 font-medium">{fmt(totalJobPay)}</span>
            </div>
            {totalBonuses > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-yellow-400 flex items-center gap-1"><Star size={12} /> Bonuses</span>
                <span className="text-yellow-300 font-medium">+{fmt(totalBonuses)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-700">
              <span className="text-white">Total</span>
              <span className="text-green-400">{fmt(totalEarnings)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Damage-free info */}
      <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-2xl px-4 py-3 flex gap-3">
        <Star size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-300 text-sm font-semibold">Damage-Free Bonus</p>
          <p className="text-yellow-200/70 text-xs mt-0.5">
            Earn a ${DAMAGE_FREE_BONUS} bonus for every completed job where the pre-move inventory check is submitted with all items marked OK.
          </p>
        </div>
      </div>
    </div>
  );
}