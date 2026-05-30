import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, AlertTriangle, CheckCircle, Mail, Phone, RefreshCw, Truck, MapPin } from "lucide-react";

const statusColors = {
  "On Schedule": "bg-green-100 text-green-700 border-green-300",
  "Behind Schedule": "bg-red-100 text-red-700 border-red-300",
  "Running Late": "bg-orange-100 text-orange-700 border-orange-300",
};

export default function ScheduleMonitoring() {
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sendingNotification, setSendingNotification] = useState(false);

  const monitorMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("monitorTruckSchedule", {});
      return response.data;
    },
    onSuccess: (data) => {
      setMonitoringData(data);
      setLoading(false);
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await base44.functions.invoke("sendDelayNotification", payload);
      return response.data;
    },
    onSuccess: () => {
      alert("Notification sent successfully!");
      setShowNotificationModal(false);
      setCustomMessage("");
      handleRefresh();
    },
    onError: (error) => {
      alert("Error sending notification: " + error.message);
      setSendingNotification(false);
    }
  });

  useEffect(() => {
    handleRefresh();
    const interval = setInterval(handleRefresh, 60000); // Auto-refresh every minute
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    monitorMutation.mutate();
  };

  const handleSendNotification = (job) => {
    setSelectedJob(job);
    setShowNotificationModal(true);
  };

  const confirmSendNotification = () => {
    setSendingNotification(true);
    sendNotificationMutation.mutate({
      booking_id: selectedJob.booking_id,
      booking_number: selectedJob.booking_number,
      customer_name: selectedJob.customer_name,
      customer_email: selectedJob.customer_email,
      customer_mobile: selectedJob.customer_mobile,
      delay_minutes: selectedJob.delay_minutes,
      new_eta: selectedJob.eta,
      message: customMessage,
    });
  };

  if (!monitoringData && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-500">Loading schedule monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Schedule Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time tracking of job progress against schedules</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Monitoring..." : "Refresh"}
        </button>
      </div>

      {/* Summary Stats */}
      {monitoringData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Truck size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{monitoringData.total_active}</p>
                <p className="text-xs text-gray-500">Active Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{monitoringData.on_schedule_count}</p>
                <p className="text-xs text-gray-500">On Schedule</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center">
                <AlertTriangle size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{monitoringData.behind_schedule_count}</p>
                <p className="text-xs text-gray-500">Behind Schedule</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{new Date(monitoringData.checked_at).toLocaleTimeString()}</p>
                <p className="text-xs text-gray-500">Last Checked</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Active Jobs Monitoring
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {monitoringData?.monitored_jobs?.length || 0} jobs being tracked
          </p>
        </div>

        {!monitoringData?.monitored_jobs || monitoringData.monitored_jobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Clock size={40} className="mx-auto mb-3 opacity-50" />
            <p>No active jobs being monitored at this time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {monitoringData.monitored_jobs.map((job) => (
              <div key={job.booking_id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {job.booking_number} - {job.customer_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[job.status]}`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Truck:</span>
                        <p className="font-medium text-gray-800">{job.truck_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Scheduled:</span>
                        <p className="font-medium text-gray-800">{job.scheduled_start}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Status:</span>
                        <p className="font-medium text-gray-800">{job.current_status}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Speed:</span>
                        <p className="font-medium text-gray-800">{job.truck_speed} km/h</p>
                      </div>
                    </div>

                    {job.is_behind_schedule && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-red-800 mb-1">
                              Running {job.delay_minutes} minutes behind schedule
                            </p>
                            <p className="text-sm text-red-700">
                              Expected completion: {job.expected_end ? new Date(job.expected_end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              {job.eta && ` • New ETA: ${new Date(job.eta).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              Progress: {job.progress_percentage}%
                            </p>
                          </div>
                          <button
                            onClick={() => handleSendNotification(job)}
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex-shrink-0"
                          >
                            <Mail size={16} />
                            Notify Customer
                          </button>
                        </div>
                      </div>
                    )}

                    {!job.is_behind_schedule && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle size={16} />
                        <p>Job is progressing as scheduled ({job.progress_percentage}% complete)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {showNotificationModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Mail size={20} className="text-orange-600" />
                Send Delay Notification
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Booking #{selectedJob.booking_number} - {selectedJob.customer_name}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Delay:</strong> {selectedJob.delay_minutes} minutes behind schedule
                </p>
                {selectedJob.eta && (
                  <p className="text-sm text-yellow-800 mt-2">
                    <strong>New ETA:</strong> {new Date(selectedJob.eta).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={selectedJob.customer_email}
                  readOnly
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add any additional details or apologies..."
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="text-xs text-gray-500">
                <p>The customer will receive an email notification with:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Delay duration ({selectedJob.delay_minutes} minutes)</li>
                  <li>Updated ETA</li>
                  <li>Apology and explanation</li>
                  <li>Your custom message (if provided)</li>
                </ul>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNotificationModal(false);
                  setCustomMessage("");
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSendNotification}
                disabled={sendingNotification}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Mail size={16} />
                {sendingNotification ? "Sending..." : "Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}