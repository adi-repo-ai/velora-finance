import { LinearGradient, vec } from '@shopify/react-native-skia';
import { View } from 'react-native';
import { Area, CartesianChart, Line } from 'victory-native';

export function NetWorthChart({ data, height = 110 }: { data: { month: string; net_worth: number }[]; height?: number }) {
  if (data.length < 2) return null;
  const points = data.map((d, i) => ({ i, v: d.net_worth / 100 }));
  return (
    <View style={{ height }} accessible accessibilityLabel="Net worth trend over the past year">
    <CartesianChart data={points} xKey="i" yKeys={['v']} domainPadding={{ top: 12 }}>
      {({ points: p, chartBounds }) => (
        <>
          <Area points={p.v} y0={chartBounds.bottom} curveType="natural" animate={{ type: 'timing', duration: 1600 }}>
            <LinearGradient start={vec(0, chartBounds.top)} end={vec(0, chartBounds.bottom)} colors={['rgba(201,155,91,0.35)', 'rgba(201,155,91,0)']} />
          </Area>
          <Line points={p.v} color="#a87634" strokeWidth={2.5} curveType="natural" animate={{ type: 'timing', duration: 1600 }} />
        </>
      )}
    </CartesianChart>
    </View>
  );
}
