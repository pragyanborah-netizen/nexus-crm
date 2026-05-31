import { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";

const POLICY_POINTS = [
  "Drivers are paid from the time the truck is started at the depot until the time the truck returns to the depot at the completion of the job.",
  "Once the customer has signed off on the booking, the driver must depart the customer's premises promptly and proceed directly back to the depot.",
  "The return travel time is calculated from the customer's location to the depot based on the normal travel route and conditions.",
  "Any time spent waiting, stopping, or remaining at the customer's premises after sign-off will NOT be paid unless prior approval has been obtained from management.",
  "Drivers are expected to complete all paperwork and leave the site promptly to ensure accurate payroll calculations and operational efficiency.",
];

export default function PaymentPolicy() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-4 mt-4 rounded-xl border border-blue-700/50 bg-blue-900/30 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-blue-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-blue-200">Driver Payment Policy</span>
        </div>
        {open
          ? <ChevronUp size={14} className="text-blue-400" />
          : <ChevronDown size={14} className="text-blue-400" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-blue-700/30 pt-3">
          {POLICY_POINTS.map((point, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-blue-400 font-bold text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
              <p className="text-xs text-blue-100 leading-relaxed">{point}</p>
            </div>
          ))}
          <p className="text-xs text-blue-400 italic pt-1 border-t border-blue-700/30 mt-2">
            Questions? Contact management before leaving any job site.
          </p>
        </div>
      )}
    </div>
  );
}