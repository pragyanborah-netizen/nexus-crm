const inputClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500";
const selectClass = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-white";

function CrmRow({ label, children }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center border-b border-gray-100 px-6 py-2.5">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function CrmSection({ title }) {
  return (
    <div className="px-6 py-3 border-b-2 border-blue-500 mt-4 first:mt-0">
      <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{title}</h2>
    </div>
  );
}

export default function BookingOverviewTab({ form, set, trucks = [] }) {
  const flatFeeTotal = (() => {
    try {
      const parsed = JSON.parse(form.flat_rate_charges || "[]");
      return parsed.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0) || "";
    } catch { return ""; }
  })();

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Customer */}
      <CrmSection title="Customer Details" />
      <CrmRow label="First Name">
        <input className={inputClass} value={form.customer_first_name} onChange={e => set("customer_first_name", e.target.value)} placeholder="First name" />
      </CrmRow>
      <CrmRow label="Last Name">
        <input className={inputClass} value={form.customer_last_name} onChange={e => set("customer_last_name", e.target.value)} placeholder="Last name" />
      </CrmRow>
      <CrmRow label="Mobile">
        <input className={inputClass} value={form.customer_mobile} onChange={e => set("customer_mobile", e.target.value)} placeholder="Mobile number" />
      </CrmRow>
      <CrmRow label="Email">
        <input className={inputClass} type="email" value={form.customer_email} onChange={e => set("customer_email", e.target.value)} placeholder="Email address" />
      </CrmRow>
      <CrmRow label="Customer Type">
        <select className={selectClass} value={form.customer_type} onChange={e => set("customer_type", e.target.value)}>
          <option>Residential</option><option>Commercial</option><option>Office</option>
        </select>
      </CrmRow>
      <CrmRow label="Booking Number">
        <input className={inputClass} value={form.booking_number} onChange={e => set("booking_number", e.target.value)} placeholder="Auto-generated if blank" />
      </CrmRow>

      {/* Booking Details */}
      <CrmSection title="Booking Details" />
      <CrmRow label="Move Date">
        <input type="date" className={inputClass} value={form.move_date || ""} onChange={e => set("move_date", e.target.value)} />
      </CrmRow>
      <CrmRow label="Move Time">
        <input type="time" className={inputClass} value={form.move_time || ""} onChange={e => set("move_time", e.target.value)} />
      </CrmRow>
      <CrmRow label="Estimated Hours">
        <select className={selectClass} value={form.estimated_hours || ""} onChange={e => set("estimated_hours", e.target.value)}>
          <option value="">Select hours...</option>
          {Array.from({ length: 32 }, (_, i) => (i + 1) * 0.5).map(h => (
            <option key={h} value={h}>{h} hr{h !== 1 ? "s" : ""}</option>
          ))}
        </select>
      </CrmRow>
      <CrmRow label="Truck 1">
        <select className={selectClass} value={form.truck_size || ""} onChange={e => set("truck_size", e.target.value)}>
          <option value="">Select Truck</option>
          <option value="2T">Van</option>
          <option value="5T">5 Tonne Truck</option>
          <option value="6T">6 Tonne Truck</option>
          <option value="10T">10 Tonne Truck</option>
          <option value="12T">12 Tonne Truck</option>
        </select>
      </CrmRow>
      <CrmRow label="Truck 2 (if needed)">
        <select className={selectClass} value={form.truck_assigned || ""} onChange={e => set("truck_assigned", e.target.value)}>
          <option value="">Select Truck</option>
          {trucks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </CrmRow>
      <CrmRow label="Man Power">
        <select className={selectClass} value={form.num_movers || ""} onChange={e => set("num_movers", e.target.value)}>
          <option value="">Select...</option>
          {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Mover{n !== 1 ? "s" : ""}</option>)}
        </select>
      </CrmRow>
      <CrmRow label="Quoted Rate ($/hr)">
        <input type="number" className={inputClass} value={form.moving_rate_per_hour || ""} onChange={e => set("moving_rate_per_hour", e.target.value)} placeholder="Hourly rate" />
      </CrmRow>
      <CrmRow label="Total Quote ($)">
        <input type="number" className={inputClass} value={form.price || ""} onChange={e => set("price", e.target.value)} placeholder="Total quoted price" />
      </CrmRow>
      <CrmRow label="Flat Fee ($)">
        <input type="number" className={`${inputClass} bg-gray-50`} value={flatFeeTotal} readOnly placeholder="Set in Services tab" />
      </CrmRow>
      <CrmRow label="Booking Status">
        <select className={selectClass} value={form.status} onChange={e => set("status", e.target.value)}>
          {["Enquiry", "Quoted", "Tentative Booking", "Confirmed", "Booked Job", "Completed", "Cancelled", "No Show"].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </CrmRow>
      <CrmRow label="Deposit Amount ($)">
        <input type="number" className={inputClass} value={form.deposit || ""} onChange={e => set("deposit", e.target.value)} placeholder="Deposit amount" />
      </CrmRow>
      <CrmRow label="Balance Due ($)">
        <input type="number" className={inputClass} value={form.balance_due || ""} onChange={e => set("balance_due", e.target.value)} placeholder="Balance due" />
      </CrmRow>
      <CrmRow label="Payment Method">
        <select className={selectClass} value={form.payment_method || ""} onChange={e => set("payment_method", e.target.value)}>
          <option value="">Select...</option>
          <option>Cash</option><option>Card</option><option>Bank Transfer</option><option>Invoice</option>
        </select>
      </CrmRow>

      {/* Addresses */}
      <CrmSection title="Addresses" />
      <CrmRow label="Pickup Address">
        <input className={inputClass} value={form.pickup_address} onChange={e => set("pickup_address", e.target.value)} placeholder="Street address" />
      </CrmRow>
      <CrmRow label="Pickup Suburb">
        <input className={inputClass} value={form.pickup_suburb} onChange={e => set("pickup_suburb", e.target.value)} placeholder="Suburb" />
      </CrmRow>
      <CrmRow label="Delivery Address">
        <input className={inputClass} value={form.delivery_address} onChange={e => set("delivery_address", e.target.value)} placeholder="Street address" />
      </CrmRow>
      <CrmRow label="Delivery Suburb">
        <input className={inputClass} value={form.delivery_suburb} onChange={e => set("delivery_suburb", e.target.value)} placeholder="Suburb" />
      </CrmRow>

      {/* Notes */}
      <CrmSection title="Notes" />
      <div className="px-6 py-3">
        <textarea
          className={inputClass}
          rows={3}
          value={form.notes || ""}
          onChange={e => set("notes", e.target.value)}
          placeholder="Notes for this booking..."
        />
      </div>
    </div>
  );
}