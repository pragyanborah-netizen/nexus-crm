import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, ThumbsUp, ThumbsDown, Calendar, User, Mail, MessageSquare, TrendingUp, Award } from "lucide-react";
import { Link } from "react-router-dom";

const statusColors = {
  "Enquiry": "bg-sky-100 text-sky-800",
  "Quoted": "bg-purple-100 text-purple-800",
  "Tentative Booking": "bg-yellow-100 text-yellow-800",
  "Confirmed": "bg-emerald-100 text-emerald-800",
  "Booked Job": "bg-green-600 text-white",
  "Completed": "bg-gray-100 text-gray-600",
  "Cancelled": "bg-red-100 text-red-700",
  "No Show": "bg-orange-100 text-orange-700",
};

export default function FeedbackDashboard() {
  const [filter, setFilter] = useState("all");

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => base44.entities.Survey.list("-survey_submitted_date", 500),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => base44.entities.Booking.list("-move_date", 500),
  });

  // Calculate statistics
  const submittedSurveys = surveys.filter(s => s.survey_submitted_date);
  const avgOverall = submittedSurveys.length > 0 
    ? (submittedSurveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / submittedSurveys.length).toFixed(1)
    : "0";
  const avgTeam = submittedSurveys.length > 0
    ? (submittedSurveys.reduce((sum, s) => sum + (s.team_rating || 0), 0) / submittedSurveys.length).toFixed(1)
    : "0";
  const recommendRate = submittedSurveys.length > 0
    ? ((submittedSurveys.filter(s => s.would_recommend).length / submittedSurveys.length) * 100).toFixed(0)
    : "0";

  const filteredSurveys = filter === "all" 
    ? surveys 
    : surveys.filter(s => {
        if (filter === "submitted") return !!s.survey_submitted_date;
        if (filter === "pending") return !s.survey_submitted_date;
        if (filter === "5star") return s.overall_rating === 5;
        if (filter === "low") return s.overall_rating && s.overall_rating <= 3;
        return true;
      });

  const getBooking = (survey) => {
    return bookings.find(b => b.id === survey.booking_id);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Customer Feedback</h1>
        <p className="text-sm text-gray-500">View survey responses and customer ratings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star size={20} className="text-yellow-500 fill-yellow-500" />
            <p className="text-xs text-gray-400">Avg Overall Rating</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">{avgOverall}<span className="text-lg text-gray-400">/5</span></p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award size={20} className="text-blue-500" />
            <p className="text-xs text-gray-400">Avg Team Rating</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">{avgTeam}<span className="text-lg text-gray-400">/5</span></p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp size={20} className="text-green-500" />
            <p className="text-xs text-gray-400">Recommendation Rate</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">{recommendRate}<span className="text-lg text-gray-400">%</span></p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={20} className="text-purple-500" />
            <p className="text-xs text-gray-400">Total Responses</p>
          </div>
          <p className="text-3xl font-bold text-gray-800">{submittedSurveys.length}<span className="text-lg text-gray-400">/{surveys.length}</span></p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Surveys ({surveys.length})
          </button>
          <button
            onClick={() => setFilter("submitted")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              filter === "submitted" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Submitted ({submittedSurveys.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              filter === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Pending ({surveys.length - submittedSurveys.length})
          </button>
          <button
            onClick={() => setFilter("5star")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              filter === "5star" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⭐ 5 Stars
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
              filter === "low" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ⚠️ Low Ratings (≤3)
          </button>
        </div>
      </div>

      {/* Survey List */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Customer</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Move Date</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Overall</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Team</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Care</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Punctuality</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Value</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Recommend</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Comments</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">Loading surveys...</td>
                </tr>
              )}
              {!isLoading && filteredSurveys.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">No surveys found</td>
                </tr>
              )}
              {filteredSurveys.map((survey) => {
                const booking = getBooking(survey);
                const hasRatings = !!survey.survey_submitted_date;
                return (
                  <tr key={survey.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{survey.customer_name || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{survey.customer_email || "No email"}</p>
                        <p className="text-xs text-blue-600">#{survey.booking_number}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        {survey.move_date ? new Date(survey.move_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings && survey.overall_rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={`text-lg font-bold ${survey.overall_rating >= 4 ? "text-green-600" : survey.overall_rating === 3 ? "text-yellow-600" : "text-red-600"}`}>
                            {survey.overall_rating}
                          </span>
                          <Star size={16} className="fill-yellow-400 text-yellow-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings && survey.team_rating ? (
                        <span className={`font-semibold ${survey.team_rating >= 4 ? "text-green-600" : "text-gray-600"}`}>
                          {survey.team_rating}/5
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings && survey.care_rating ? (
                        <span className={`font-semibold ${survey.care_rating >= 4 ? "text-green-600" : "text-gray-600"}`}>
                          {survey.care_rating}/5
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings && survey.punctuality_rating ? (
                        <span className={`font-semibold ${survey.punctuality_rating >= 4 ? "text-green-600" : "text-gray-600"}`}>
                          {survey.punctuality_rating}/5
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings && survey.value_rating ? (
                        <span className={`font-semibold ${survey.value_rating >= 4 ? "text-green-600" : "text-gray-600"}`}>
                          {survey.value_rating}/5
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasRatings ? (
                        survey.would_recommend ? (
                          <ThumbsUp size={18} className="text-green-600 mx-auto" />
                        ) : (
                          <ThumbsDown size={18} className="text-red-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasRatings && survey.comments ? (
                        <div className="max-w-xs">
                          <p className="text-xs text-gray-600 line-clamp-2">{survey.comments}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No comments</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {booking && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[booking.status] || "bg-gray-100 text-gray-600"}`}>
                          {booking.status || "Unknown"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}