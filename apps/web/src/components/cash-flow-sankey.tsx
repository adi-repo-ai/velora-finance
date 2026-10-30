"use client";

import { isColorToken, rgb } from "@velora/config";
import { formatMoney, type Currency } from "@velora/core";
import { Layer, Rectangle, ResponsiveContainer, Sankey, type SankeyLinkProps, type SankeyNodeProps } from "recharts";

type Row = { name: string; color: string; total: number };
/** Extra fields we attach to each Sankey node. */
type NodeData = { name: string; color: string; amount: number };
const tone = (c: string) => (isColorToken(c) ? rgb(c) : rgb("gold-1"));

/** income sources → Cash in → spending categories (+ Saved when the month is net positive). */
export function CashFlowSankey({ income, spending, currency }: { income: Row[]; spending: Row[]; currency: Currency }) {
  const totalIn = income.reduce((s, r) => s + r.total, 0);
  const totalOut = spending.reduce((s, r) => s + r.total, 0);
  const outs = totalIn > totalOut ? [...spending, { name: "Saved", color: "gold-1", total: totalIn - totalOut }] : spending;
  const nodes = [...income, { name: "Cash in", color: "gold-2", total: totalIn }, ...outs];
  const hub = income.length;
  const data = {
    nodes: nodes.map((n) => ({ name: n.name, color: tone(n.color), amount: n.total })),
    links: [
      ...income.map((r, i) => ({ source: i, target: hub, value: r.total })),
      // Spending above income still flows from the hub so the diagram stays connected.
      ...outs.map((r, i) => ({ source: hub, target: hub + 1 + i, value: r.total })),
    ],
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Sankey
        data={data}
        nodeWidth={10}
        nodePadding={18}
        margin={{ top: 10, right: 190, bottom: 10, left: 150 }}
        link={(p: SankeyLinkProps) => {
          const id = `lg${p.index}`;
          const [from, to] = [p.payload.source as unknown as NodeData, p.payload.target as unknown as NodeData];
          return (
            <Layer key={id}>
              <defs>
                <linearGradient id={id}>
                  <stop offset="0" stopColor={from.color} stopOpacity={0.35} />
                  <stop offset="1" stopColor={to.color} stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <path
                d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
                fill="none" stroke={`url(#${id})`} strokeWidth={p.linkWidth}
              />
              <path
                d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
                fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="3 22"
                className="motion-safe:animate-[flow_1.6s_linear_infinite]"
              />
            </Layer>
          );
        }}
        node={(p: SankeyNodeProps) => {
          const n = p.payload as unknown as NodeData;
          const left = p.index < hub;
          const isHub = p.index === hub;
          const tx = left ? p.x - 14 : p.x + p.width + 14;
          return (
            <Layer key={`n${p.index}`}>
              <Rectangle x={p.x} y={p.y} width={p.width} height={p.height} radius={4} fill={n.color} />
              {isHub ? (
                <text x={p.x + p.width / 2} y={p.y - 10} textAnchor="middle" fontSize={11} fontFamily="var(--font-geist-mono)" letterSpacing={2} fill="currentColor" fillOpacity={0.5}>
                  CASH IN · {formatMoney(n.amount, currency)}
                </text>
              ) : (
                <text x={tx} y={p.y + p.height / 2} textAnchor={left ? "end" : "start"} dominantBaseline="middle" fill="currentColor">
                  <tspan fontSize={14}>{n.name}</tspan>
                  <tspan dx={8} fontSize={20} fontFamily="var(--font-instrument)">{formatMoney(n.amount, currency)}</tspan>
                </text>
              )}
            </Layer>
          );
        }}
      />
    </ResponsiveContainer>
  );
}
