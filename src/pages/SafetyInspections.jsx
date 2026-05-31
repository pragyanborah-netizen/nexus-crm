import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, CheckCircle, Camera, ChevronDown, ChevronUp, Search, Filter, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  "Submitted": "bg-blue-100 text-blue-700",
  "Reviewed": "bg-green-100 text-green-700",
  "Action Required": "bg-red-100 text-red-700",
};

const CONDITION_STYLES = {
  "Good": "bg-green-100 text-green-700",
  "Minor Issues": "bg-yellow-100 text-yellow-700",
  "Major Issues - Do Not Use": "bg-red-100 text-red-700",
};

function InspectionCard({ inspection, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);

  const totalSafety = Object.values(inspection.safety_gear || {}).filter(Boolean).length;
  const totalVehicle = Object.values(inspection.vehicle_checks || {}).filter(Boolean).length;
  const allPhotos = [
    ...(inspection.exterior_photos || []),
    ...(inspection.interior_photos || []),
    ...(inspection.damage_photos || []),
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800">{inspection.truck_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_STYLES[inspection.truck_condition] || "bg-gray-100 text-gray-600"}`}>
              {inspection.truck_condition || "Not set"}
            </span>
            {inspection.damage_noted && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                <AlertTriangle size={10} /> Damage noted
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {inspection.inspector_name} · {inspection.inspection_date ? new Date(inspection.inspection_date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
            {inspection.inspection_time ? ` at ${inspection.inspection_time}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Safety Gear</p>
            <p className={`text-sm font-semibold ${totalSafety < 7 ? "text-yellow-600" : "text-green-600"}`}>{totalSafety}/7</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">Vehicle</p>
            <p className={`text-sm font-semibold ${totalVehicle < 10 ? "text-yellow-600" : "text-green-600"}`}>{totalVehicle}/10</p>
          </div>
          {allPhotos.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <Camera size={11} /> {allPhotos.length}
            </div>
          )}
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_STYLES[inspection.status] || "bg-gray-100 text-gray-600"}`}>
            {inspection.status}
          </span>
          {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-4">
          {/* Status update */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Update Status:</span>
            {["Submitted", "Reviewed", "Action Required"].map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(inspection.id, s)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all ${
                  inspection.status === s ? STATUS_STYLES[s] + " border-current" : "border-gray-300 text-gray-500 hover:border-gray-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Checklists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Safety Gear</p>
              <div className="space-y-1">
                {Object.entries(inspection.safety_gear || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {val
                      ? <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      : <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" />}
                    <span className={val ? "text-gray-600" : "text-yellow-700 font-medium"}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Vehicle Checks</p>
              <div className="space-y-1">
                {Object.entries(inspection.vehicle_checks || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {val
                      ? <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      : <AlertTriangle size={12} className="text-yellow-500 flex-shrink-0" />}
                    <span className={val ? "text-gray-600" : "text-yellow-700 font-medium"}>
                      {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Damage */}
          {inspection.damage_noted && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1.5">
                <AlertTriangle size={12} /> Pre-existing Damage
              </p>
              <p className="text-xs text-orange-700">{inspection.damage_description || "No description provided."}</p>
            </div>
          )}

          {/* Photos */}
          {allPhotos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Photos ({allPhotos.length})</p>
              <div className="flex flex-wrap gap-2">
                {allPhotos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity">
                    <img src={url} alt={`photo-${i}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {inspection.notes && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Notes</p>
              <p className="text-xs text-gray-600 bg-white rounded-lg border border-gray-200 px-3 py-2">{inspection.notes}</p>
            </div>
          )}

          {inspection.booking_number && (
            <p className="text-xs text-gray-500">Booking: <span className="font-mono font-semibold">{inspection.booking_number}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SafetyInspections() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["safety-inspections"],
    queryFn: () => base44.entities.TruckSafetyInspection.list("-inspection_date"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TruckSafetyInspection.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["safety-inspections"] }),
  });

  const filtered = inspections.filter(i => {
    if (search && !i.truck_name?.toLowerCase().includes(search.toLowerCase()) && !i.inspector_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterCondition !== "all" && i.truck_condition !== filterCondition) return false;
    return true;
  });

  const flagged = inspections.filter(i => i.truck_condition === "Major Issues - Do Not Use" || i.status === "Action Required").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" /> Safety Inspections
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Review pre-shift truck safety inspection records</p>
        </div>
        <div className="flex items-center gap-2">
          {flagged > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-medium">
              <AlertTriangle size={15} />
              {flagged} issue{flagged !== 1 ? "s" : ""} flagged
            </div>
          )}
          <Link
            to="/safety-inspection"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <ExternalLink size={14} /> Start Inspection
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search truck or inspector..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="all">All Statuses</option>
          <option value="Submitted">Submitted</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Action Required">Action Required</option>
        </select>
        <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
          <option value="all">All Conditions</option>
          <option value="Good">Good</option>
          <option value="Minor Issues">Minor Issues</option>
          <option value="Major Issues - Do Not Use">Major Issues</option>
        </select>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Shield size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-600">No inspections found</p>
          <p className="text-sm mt-1">Share the inspection link with movers before shifts</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(inspection => (
          <InspectionCard
            key={inspection.id}
            inspection={inspection}
            onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
          />
        ))}
      </div>
    </div>
  );
}