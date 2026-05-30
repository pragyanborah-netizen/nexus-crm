import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Mail, RefreshCw, CheckCircle, AlertCircle, Inbox, ArrowRight, Calendar, MapPin, Package, User, Phone } from "lucide-react";

export default function GmailEnquiryProcessor() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectUrl, setConnectUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    try {
      const connectorId = localStorage.getItem('gmail_connector_id') || 'gmail';
      const response = await base44.functions.invoke('processGmailEnquiries', {});
      if (response.data && !response.data.error) {
        setIsConnected(true);
      }
    } catch (err) {
      setIsConnected(false);
      if (err.response?.data?.connect_url) {
        setConnectUrl(err.response.data.connect_url);
      }
    }
  };

  useEffect(() => {
    checkConnection();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    try {
      const connectorId = 'gmail';
      const url = await base44.connectors.connectAppUser(connectorId);
      localStorage.setItem('gmail_connector_id', connectorId);
      
      const popup = window.open(url, '_blank', 'width=600,height=700');
      
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setTimeout(() => {
            checkConnection();
          }, 1000);
        }
      }, 500);
    } catch (err) {
      setError('Failed to connect Gmail: ' + err.message);
    }
  };

  const processEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('processGmailEnquiries', {});
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data);
      setProcessing(false);
      if (data.error) {
        setError(data.error);
      }
    },
    onError: (err) => {
      setProcessing(false);
      setError(err.message);
    }
  });

  const handleProcessEmails = () => {
    setProcessing(true);
    setError(null);
    setResults(null);
    processEmailsMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center">
            <Mail size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gmail Enquiry Processor</h1>
            <p className="text-sm text-gray-500 mt-1">
              Automatically extract customer enquiries from Gmail and create bookings
            </p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`rounded-lg border-2 p-4 ${isConnected ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Gmail Connected</p>
                    <p className="text-sm text-green-600">Ready to process enquiry emails</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={24} className="text-gray-400" />
                  <div>
                    <p className="font-semibold text-gray-700">Gmail Not Connected</p>
                    <p className="text-sm text-gray-500">Connect your Gmail account to start processing enquiries</p>
                  </div>
                </>
              )}
            </div>
            {!isConnected && (
              <button
                onClick={handleConnect}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Mail size={18} /> Connect Gmail
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Process Button */}
      {isConnected && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Inbox size={20} className="text-blue-600" />
            Process Recent Emails
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            This will scan your last 10 Gmail messages, identify enquiry emails, and automatically create bookings with all extracted information including customer details, move dates, addresses, and inventory items.
          </p>
          <button
            onClick={handleProcessEmails}
            disabled={processing}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={20} className={processing ? 'animate-spin' : ''} />
            {processing ? 'Processing Emails...' : 'Process Enquiry Emails'}
          </button>
        </div>
      )}

      {/* Results */}
      {results && !results.error && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Processing Complete
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Emails Processed</p>
                <p className="text-2xl font-bold text-blue-700">{results.processed}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 font-medium">Bookings Created</p>
                <p className="text-2xl font-bold text-green-700">{results.bookings_created || 0}</p>
              </div>
            </div>
          </div>

          {/* Email Details */}
          {results.results && results.results.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Inbox size={20} className="text-gray-600" />
                Processed Emails
              </h2>
              <div className="space-y-3">
                {results.results.map((email, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <Mail size={18} className="text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-800">{email.subject || 'No Subject'}</p>
                          <p className="text-sm text-gray-500">{email.from}</p>
                        </div>
                      </div>
                      {email.processed && (
                        <CheckCircle size={20} className="text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-gray-800 mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">Connect Gmail</p>
              <p className="text-sm text-gray-500">Securely connect your Gmail account using OAuth</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">Scan Emails</p>
              <p className="text-sm text-gray-500">System scans your recent emails for enquiry keywords (enquiry, quote, booking, move)</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">Extract Information</p>
              <p className="text-sm text-gray-500">AI extracts customer details, move dates, addresses, services, and inventory items</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-bold text-sm">4</span>
            </div>
            <div>
              <p className="font-medium text-gray-800">Create Booking</p>
              <p className="text-sm text-gray-500">Automatic booking creation with all extracted information</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}