"use client";

import { formatCompact, formatMoney, type Currency } from "@velora/core";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const monthLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleString("en", { month: "short" }).toUpperCase();

export function NetWorthChart({ data, currency }: { data: { month: string; net_worth: number }[]; currency: Currency }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c99b5b" stopOpacity={0.32} />
            <stop offset="1" stopColor="#c99b5b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="nwLine" x1="0" x2="1">
            <stop offset="0" stopColor="#7a5226" />
            <stop offset="1" stopColor="#c99b5b" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="2 6" />
        <XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} tick={{ fontSize: 10, fontFamily: "var(--font-geist-mono)", fill: "currentColor", fillOpacity: 0.4, letterSpacing: 1.5 }} />
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Tooltip
          cursor={{ stroke: "rgb(201 155 91 / .5)", strokeDasharray: "3 4" }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as { month: string; net_worth: number } | undefined;
            if (!active || !p) return null;
            return (
              <div className="glass rounded-2xl px-4 py-3">
                <p className="label-mono">{new Date(`${p.month}T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" })}</p>
                <p className="mt-1 font-serif text-2xl">{formatMoney(p.net_worth, currency)}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone" dataKey="net_worth" stroke="url(#nwLine)" strokeWidth={2.2} fill="url(#nwFill)"
          animationDuration={2200} animationEasing="ease-out"
          activeDot={{ r: 6, fill: "#c99b5b", stroke: "#fff", strokeWidth: 2 }}
          name={`Net worth (${formatCompact(data.at(-1)?.net_worth ?? 0, currency)})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
