import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Star, Send, ThumbsUp, ThumbsDown, CheckCircle } from "lucide-react";

const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";

export default function SurveyPage() {
  const { survey_id } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const { data: survey, isLoading } = useQuery({
    queryKey: ["survey", survey_id],
    queryFn: () => base44.entities.Survey.get(survey_id),
    enabled: !!survey_id,
  });

  const [ratings, setRatings] = useState({
    overall: 0,
    team: 0,
    care: 0,
    punctuality: 0,
    value: 0,
  });
  const [comments, setComments] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("submitSurveyResponse", {
        survey_id,
        ratings,
        comments,
        would_recommend: wouldRecommend,
      });
      return response.data;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = () => {
    if (ratings.overall === 0) {
      alert("Please provide an overall rating");
      return;
    }
    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Survey Not Found</h1>
          <p className="text-gray-600 mb-4">This survey link may be invalid or expired.</p>
          <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">Return to Home</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Thank you {survey.customer_name?.split(" ")[0] || "there"} for your valuable feedback. 
            Your responses help us improve our service.
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              We appreciate you taking the time to share your experience with us.
            </p>
          </div>
          <button 
            onClick={() => window.close()} 
            className="text-blue-600 hover:underline text-sm"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const StarRating = ({ label, value, onChange }) => (
    <div className="mb-6">
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              size={32}
              className={
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
              }
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {value === 0 ? "Not rated" : value === 1 ? "Very Poor" : value === 2 ? "Poor" : value === 3 ? "Average" : value === 4 ? "Good" : "Excellent"}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Star size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Rate Your Moving Experience</h1>
              <p className="text-sm text-gray-500">Booking #{survey.booking_number} • {survey.move_date ? new Date(survey.move_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
            </div>
          </div>
          <p className="text-gray-600">
            Hi {survey.customer_name?.split(" ")[0] || "there"}, we'd love to hear about your recent move with us. 
            Please take a moment to rate your experience.
          </p>
        </div>

        {/* Rating Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Overall Experience</h2>
          <StarRating
            label="How would you rate your overall experience?"
            value={ratings.overall}
            onChange={(val) => setRatings({ ...ratings, overall: val })}
          />

          <div className="border-t border-gray-100 pt-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Detailed Ratings</h2>
            <StarRating
              label="Team Professionalism & Friendliness"
              value={ratings.team}
              onChange={(val) => setRatings({ ...ratings, team: val })}
            />
            <StarRating
              label="Care & Handling of Your Items"
              value={ratings.care}
              onChange={(val) => setRatings({ ...ratings, care: val })}
            />
            <StarRating
              label="Punctuality & Timeliness"
              value={ratings.punctuality}
              onChange={(val) => setRatings({ ...ratings, punctuality: val })}
            />
            <StarRating
              label="Value for Money"
              value={ratings.value}
              onChange={(val) => setRatings({ ...ratings, value: val })}
            />
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Additional Comments</h2>
          <p className="text-sm text-gray-600 mb-3">Is there anything you'd like to share about your experience? (Optional)</p>
          <textarea
            className={inputClass}
            rows={4}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Tell us what went well, or how we could improve..."
          />
        </div>

        {/* Recommendation */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Would you recommend us?</h2>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                wouldRecommend
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <ThumbsUp size={20} />
              <span className="font-medium">Yes, definitely!</span>
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex-1 py-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all ${
                !wouldRecommend
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <ThumbsDown size={20} />
              <span className="font-medium">No</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || ratings.overall === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-all"
          >
            <Send size={20} />
            {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Your feedback is confidential and will only be used to improve our service.
          </p>
        </div>
      </div>
    </div>
  );
}