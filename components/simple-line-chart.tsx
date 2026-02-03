import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

interface ChartPoint {
  x: number;
  y: number;
}

interface SimpleLineChartProps {
  data: number[];
  color: string;
  width: number;
  height: number;
  labels?: string[];
}

export function SimpleLineChart({ data, color, width, height, labels }: SimpleLineChartProps) {
  if (!data || data.length === 0) return null;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;

  // Scale data to chart coordinates
  const points: ChartPoint[] = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y };
  });

  // Create polyline points string
  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = padding + chartHeight * (1 - ratio);
          const value = minValue + range * ratio;
          return (
            <React.Fragment key={i}>
              <Line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={padding - 10}
                y={y + 4}
                fontSize="10"
                fill="rgba(255, 255, 255, 0.4)"
                textAnchor="end"
              >
                {Math.round(value).toLocaleString()}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Line chart */}
        <Polyline
          points={pointsString}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
          />
        ))}

        {/* X-axis labels */}
        {labels && labels.map((label, index) => {
          if (index % Math.ceil(labels.length / 7) !== 0) return null;
          const x = padding + (index / (labels.length - 1 || 1)) * chartWidth;
          return (
            <SvgText
              key={index}
              x={x}
              y={height - padding + 20}
              fontSize="10"
              fill="rgba(255, 255, 255, 0.4)"
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
