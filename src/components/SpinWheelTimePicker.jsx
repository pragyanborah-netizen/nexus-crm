import { useState, useRef, useEffect, useCallback } from "react";

const NUM_TICKS = 60;
const RADIUS = 130;
const CENTER = 160;

function getAngle(cx, cy, ex, ey) {
  return Math.atan2(ey - cy, ex - cx);
}

function minutesToTime(baseHour, minutes) {
  const totalMinutes = baseHour * 60 + minutes;
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "pm" : "am";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function SpinWheelTimePicker({ label = "Spin", sublabel = "to set time", actionLabel = "Ends", onConfirm, onCancel }) {
  const now = new Date();
  const [totalMinutes, setTotalMinutes] = useState(now.getHours() * 60 + now.getMinutes());
  const [rotation, setRotation] = useState((now.getMinutes() / 60) * 360);

  const svgRef = useRef(null);
  const isDragging = useRef(false);
  const lastAngle = useRef(null);
  const accumulatedDelta = useRef(0);

  const getCenter = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    const { cx, cy } = getCenter();
    lastAngle.current = getAngle(cx, cy, e.clientX, e.clientY);
    svgRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const { cx, cy } = getCenter();
    const angle = getAngle(cx, cy, e.clientX, e.clientY);
    let delta = angle - lastAngle.current;
    // Wrap delta to [-π, π]
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    lastAngle.current = angle;

    accumulatedDelta.current += (delta * 180) / Math.PI;

    // Every 6° = 1 minute
    const minutesDelta = Math.round(accumulatedDelta.current / 6);
    if (minutesDelta !== 0) {
      accumulatedDelta.current -= minutesDelta * 6;
      setTotalMinutes(prev => {
        let next = prev + minutesDelta;
        // clamp to 0–1439 (24h)
        next = ((next % 1440) + 1440) % 1440;
        return next;
      });
      setRotation(prev => prev + minutesDelta * 6);
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    lastAngle.current = null;
  }, []);

  const displayH = Math.floor(totalMinutes / 60) % 24;
  const displayM = totalMinutes % 60;
  const ampm = displayH >= 12 ? "pm" : "am";
  const h12 = displayH % 12 === 0 ? 12 : displayH % 12;
  const timeStr = `${h12}:${String(displayM).padStart(2, "0")} ${ampm}`;

  const ticks = Array.from({ length: NUM_TICKS }, (_, i) => {
    const angle = (i / NUM_TICKS) * 2 * Math.PI - Math.PI / 2;
    const isLong = i % 5 === 0;
    const inner = RADIUS - (isLong ? 18 : 10);
    const outer = RADIUS - 2;
    return {
      x1: CENTER + inner * Math.cos(angle),
      y1: CENTER + inner * Math.sin(angle),
      x2: CENTER + outer * Math.cos(angle),
      y2: CENTER + outer * Math.sin(angle),
      isLong,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-between py-12 px-6">
      {/* Title */}
      <div className="text-center mt-4">
        <h1 className="text-5xl font-black text-white leading-tight">{label}</h1>
        <p className="text-4xl font-bold text-gray-400 mt-1">{sublabel}</p>
      </div>

      {/* Time display */}
      <div className="bg-[#2a2a2a] rounded-2xl px-8 py-4 flex items-center gap-3 shadow-lg">
        <div className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full" style={{ transform: `rotate(${(displayM / 60) * 360}deg)`, transformOrigin: "bottom center", marginBottom: "-4px" }} />
        </div>
        <span className="text-white text-2xl font-bold">{actionLabel} {timeStr}</span>
      </div>

      {/* Spin Wheel */}
      <div className="relative">
        <svg
          ref={svgRef}
          width={CENTER * 2}
          height={CENTER * 2}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="cursor-grab active:cursor-grabbing touch-none select-none"
        >
          {/* Outer ring background */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 8} fill="#2a2a2a" />
          {/* Inner dark circle */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS - 22} fill="#1a1a1a" />

          {/* Ticks — rotated by spin */}
          <g transform={`rotate(${rotation}, ${CENTER}, ${CENTER})`}>
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke="white"
                strokeWidth={t.isLong ? 2.5 : 1.5}
                strokeLinecap="round"
                opacity={t.isLong ? 1 : 0.7}
              />
            ))}
          </g>

          {/* Pink S-curve arrows in center */}
          <g>
            {/* Top arrow — curves right */}
            <path
              d={`M ${CENTER - 45} ${CENTER - 20} Q ${CENTER - 10} ${CENTER - 55} ${CENTER + 45} ${CENTER - 20}`}
              fill="none"
              stroke="#d946a8"
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd="url(#arrowTop)"
            />
            {/* Bottom arrow — curves left */}
            <path
              d={`M ${CENTER + 45} ${CENTER + 20} Q ${CENTER + 10} ${CENTER + 55} ${CENTER - 45} ${CENTER + 20}`}
              fill="none"
              stroke="#d946a8"
              strokeWidth="2.5"
              strokeLinecap="round"
              markerEnd="url(#arrowBottom)"
            />
            <defs>
              <marker id="arrowTop" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="none" stroke="#d946a8" strokeWidth="1.5" />
              </marker>
              <marker id="arrowBottom" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                <path d="M6,0 L0,3 L6,6" fill="none" stroke="#d946a8" strokeWidth="1.5" />
              </marker>
            </defs>
          </g>
        </svg>
      </div>

      {/* Continue button */}
      <div className="w-full space-y-3">
        <button
          onClick={() => onConfirm({ hours: displayH, minutes: displayM, timeStr })}
          className="w-full bg-[#2a2a2a] hover:bg-[#3a3a3a] text-gray-300 font-bold text-xl py-5 rounded-2xl transition-colors"
        >
          Continue
        </button>
        {onCancel && (
          <button onClick={onCancel} className="w-full text-gray-600 text-sm py-2">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}