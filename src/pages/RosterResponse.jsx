import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle, Calendar, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export default function RosterResponse() {
  const [searchParams] = useSearchParams();
  const action = searchParams.get("action");
  const token = searchParams.get("token");
  const [processed, setProcessed] = useState(false);
  const [result, setResult] = useState(null);

  const handleResponse = async () => {
    if (!action || !token || processed) return;

    try {
      const res = await base44.functions.invoke("handleRosterResponse", {
        action,
        token
      });
      setResult(res.data);
      setProcessed(true);
    } catch (error) {
      setResult({ error: error.message });
      setProcessed(true);
    }
  };

  useEffect(() => {
    handleResponse();
  }, []);

  if (!processed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md w-full">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Processing Your Response</h2>
          <p className="text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  const isSuccess = result?.success && !result?.error;
  const isAccept = action === "accept";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-10 text-center max-w-md w-full">
        {isSuccess ? (
          <>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isAccept ? "bg-green-100" : "bg-red-100"
            }`}>
              {isAccept ? (
                <CheckCircle size={40} className="text-green-600" />
              ) : (
                <XCircle size={40} className="text-red-600" />
              )}
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${isAccept ? "text-green-700" : "text-red-700"}`}>
              {isAccept ? "Shift Accepted!" : "Shift Declined"}
            </h2>
            <p className="text-gray-600 mb-4">
              {isAccept 
                ? "Thank you for confirming your availability. We'll see you on the day!"
                : "We've recorded your response. The team will find a replacement."}
            </p>
            {result?.employee_name && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600">Response recorded for <strong>{result.employee_name}</strong></p>
              </div>
            )}
          </>
        ) : (
          <>
            <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Process Response</h2>
            <p className="text-gray-500 mb-4">{result?.error || "An error occurred"}</p>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Questions? Contact the Move On Australia team.
          </p>
        </div>
      </div>
    </div>
  );
}