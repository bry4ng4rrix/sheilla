"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ORANGE = "#ef8200";
const NAVY = "#1e3a5f";
const TEAL = "#0e9f8a";
const AMBER = "#f5b041";
const ROSE = "#e5484d";
const VIOLET = "#8b5cf6";

const tooltip = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid #e9e3dc",
    boxShadow: "0 8px 24px rgb(0 0 0 / 0.08)",
    fontSize: 12,
  },
  cursor: { fill: "rgb(239 130 0 / 0.06)" },
};

export function MonthlyChart({
  data,
}: {
  data: { month: string; effectif: number; demandes: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barGap={4} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gOrange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa940" />
            <stop offset="100%" stopColor={ORANGE} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f0ebe5" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          allowDecimals={false}
        />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          dataKey="effectif"
          name="Effectif"
          fill={NAVY}
          radius={[6, 6, 0, 0]}
          maxBarSize={22}
        />
        <Bar
          dataKey="demandes"
          name="Demandes reçues"
          fill="url(#gOrange)"
          radius={[6, 6, 0, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PresenceDonut({
  present,
  absent,
  late,
  leave,
  anomaly,
  rate,
}: {
  present: number;
  absent: number;
  late: number;
  leave: number;
  anomaly: number;
  rate: number;
}) {
  const data = [
    { name: "À l'heure", value: present - late, color: TEAL },
    { name: "En retard", value: late, color: AMBER },
    { name: "Absents", value: absent, color: ROSE },
    { name: "Anomalies", value: anomaly, color: VIOLET },
    { name: "Congés / autorisations", value: leave, color: NAVY },
  ].filter((d) => d.value > 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            isAnimationActive={false}
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={100}
            paddingAngle={2}
            stroke="none"
            cornerRadius={4}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip {...tooltip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-3xl font-extrabold text-stone-900">{rate}%</p>
          <p className="text-xs font-medium text-muted-foreground">
            taux de présence
          </p>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ background: d.color }}
            />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DepartmentBars({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const colors = [ORANGE, NAVY, TEAL, AMBER, VIOLET, ROSE];
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <Tooltip {...tooltip} />
        <Bar
          dataKey="value"
          name="Agents"
          radius={[0, 8, 8, 0]}
          barSize={20}
          label={{ position: "right", fontSize: 12, fontWeight: 700 }}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LatenessArea({
  data,
}: {
  data: { month: string; retards: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f0ebe5" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          fontSize={11}
          allowDecimals={false}
        />
        <Tooltip {...tooltip} />
        <Area
          type="monotone"
          dataKey="retards"
          name="Retards"
          stroke={ORANGE}
          strokeWidth={2.5}
          fill="url(#gAmber)"
          dot={{ r: 3, fill: ORANGE }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RoleDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const colors = [ORANGE, NAVY, TEAL];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltip} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
