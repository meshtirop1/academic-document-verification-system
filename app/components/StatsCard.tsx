interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "indigo" | "green" | "yellow" | "red" | "blue";
  icon: React.ReactNode;
}

const accentMap = {
  indigo: "bg-brand-100 text-brand-700",
  green:  "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red:    "bg-red-100 text-red-700",
  blue:   "bg-blue-100 text-blue-700",
};

export function StatsCard({ title, value, subtitle, accent = "indigo", icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
