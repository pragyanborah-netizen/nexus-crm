import { useState } from "react";
import { DollarSign, Clock, MapPin, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";

const policySections = [
  {
    title: "When Payment Starts",
    icon: Clock,
    color: "bg-blue-600",
    content: "Jockeys are paid from the scheduled job start time when they sign on with the customer at the commencement of the move.",
    highlight: "Payment begins at customer sign-on",
  },
  {
    title: "Meeting at Customer Location",
    icon: MapPin,
    color: "bg-green-600",
    content: "Jockeys have the option to meet the driver directly at the customer's location at the scheduled job start time. When meeting at the customer location, payment starts immediately at the job start time with no travel time considerations.",
    highlight: "Meet at customer location = no unpaid travel time",
  },
  {
    title: "Travel Time to Job (≤30 min)",
    icon: MapPin,
    color: "bg-purple-600",
    content: "If traveling from the depot or designated meeting point, travel time is not paid if it is 30 minutes or less.",
    highlight: "Depot travel ≤30 min is unpaid",
  },
  {
    title: "Travel Time to Job (>30 min)",
    icon: AlertTriangle,
    color: "bg-orange-600",
    content: "If travel time from the depot exceeds 30 minutes, payment for any additional travel time will be at management's discretion or as otherwise agreed.",
    highlight: "Extended depot travel requires management approval",
  },
  {
    title: "When Payment Ends",
    icon: CheckCircle,
    color: "bg-green-600",
    content: "Payment ceases when the customer signs off on the completion of the job.",
    highlight: "Payment ends at customer sign-off",
  },
  {
    title: "Travel Time After Job (≤30 min)",
    icon: MapPin,
    color: "bg-indigo-600",
    content: "Travel time from the customer's location after the job is completed is not paid if the travel time back to the depot or designated meeting point is 30 minutes or less.",
    highlight: "No payment for return travel under 30 minutes",
  },
  {
    title: "Travel Time After Job (>30 min)",
    icon: AlertTriangle,
    color: "bg-red-600",
    content: "If travel time exceeds 30 minutes either before or after the job, payment for any additional travel time will be at management's discretion or as otherwise agreed.",
    highlight: "Extended return travel requires management approval",
  },
  {
    title: "Work Expectations",
    icon: DollarSign,
    color: "bg-teal-600",
    content: "Jockeys are expected to be ready to commence work at the scheduled start time and remain productive until the customer signs off on the job.",
    highlight: "Be ready at scheduled time · Stay productive throughout",
  },
  {
    title: "Exceptions & Approvals",
    icon: Info,
    color: "bg-gray-600",
    content: "Any exceptions to this policy must be approved by management prior to the job being undertaken.",
    highlight: "All exceptions require pre-approval from management",
  },
];

export default function JockeyPaymentPolicy() {
  const [expandedSection, setExpandedSection] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DollarSign size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Jockey Payment Policy</h1>
              <p className="text-blue-100 text-sm">Move On Australia — Effective 2026</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm mt-3 max-w-2xl">
            This policy outlines when payment starts and stops for jockeys, including travel time provisions and work expectations.
          </p>
        </div>
      </div>

      {/* Policy Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Quick Summary Card */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-100 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Info size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 mb-1">Quick Summary</h2>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Payment runs from <strong>customer sign-on</strong> to <strong>customer sign-off</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>Travel time ≤30 minutes (each way) is <strong>unpaid</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Extended travel (&gt;30 min) requires <strong>management approval</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600 mt-0.5">•</span>
                  <span>Stay productive from scheduled start until job completion</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-3">
          {policySections.map((section, idx) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === idx;
            
            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden"
              >
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSection(isExpanded ? null : idx)}
                >
                  <div className={`w-10 h-10 ${section.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{section.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 hidden sm:inline">
                      {isExpanded ? "Click to collapse" : "Click for details"}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-sm text-gray-700 leading-relaxed mb-3">
                      {section.content}
                    </p>
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <Info size={14} className="text-blue-600 flex-shrink-0" />
                      <p className="text-xs text-blue-700 font-medium">{section.highlight}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Important Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 mb-1">Important Notice</h3>
              <p className="text-sm text-amber-700">
                Any exceptions to this policy must be approved by management <strong>prior to the job being undertaken</strong>. 
                Retroactive approvals will not be granted. If you believe your situation warrants an exception, contact management 
                before accepting the job assignment.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            Questions about this policy? Contact your supervisor or management team.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Move On Australia · Jockey Payment Policy v1.0
          </p>
        </div>
      </div>
    </div>
  );
}