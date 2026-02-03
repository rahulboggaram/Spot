import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Stop, Text as SvgText } from 'react-native-svg';

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
  fill?: boolean;
  fillOpacity?: number;
  strokeWidth?: number;
  showPoints?: boolean;
  gridColor?: string;
  labelColor?: string;
  onPointSelect?: (index: number, value: number) => void;
  showYAxis?: boolean;
  selectedPrice?: number | null;
  selectedPercentage?: number | null;
  selectedPointX?: number | null;
  selectedPointY?: number | null;
  selectedDate?: string | null;
  scrollOffset?: number;
  onScrollOffsetChange?: (offset: number) => void;
}

export function SimpleLineChart({
  data,
  color,
  width,
  height,
  labels,
  fill = true,
  fillOpacity = 0.18,
  strokeWidth = 2,
  showPoints = false,
  gridColor = 'rgba(0, 0, 0, 0.06)',
  labelColor = 'rgba(0, 0, 0, 0.35)',
  onPointSelect,
  showYAxis = true,
  selectedPrice,
  selectedPercentage,
  selectedPointX,
  selectedPointY,
  selectedDate,
  scrollOffset = 0,
  onScrollOffsetChange,
}: SimpleLineChartProps) {
  if (!data || data.length === 0) return null;

  const paddingTop = 0;
  const paddingBottom = 0;
  // No horizontal inset: graph uses full width to match card. Labels positioned with small margin so they don't clip.
  const paddingHorizontal = 0;
  const chartWidth = width - paddingHorizontal * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate visible window based on scroll offset
  // For small datasets (<= 30 points), always show all data (ignore scroll offset)
  // For larger datasets, show all data but allow scrolling for very large datasets
  let visibleData: number[];
  let visibleLabels: string[] | undefined;
  let startIndex: number;
  
  if (data.length <= 30) {
    // Show all data for datasets up to 30 points (covers 7D, 15D, 30D)
    visibleData = data;
    visibleLabels = labels;
    startIndex = 0;
  } else {
    // For very large datasets (> 30 points), show all data but allow scrolling
    // This shouldn't happen for our use case, but handle it gracefully
    visibleData = data;
    visibleLabels = labels;
    startIndex = 0;
  }

  // Safety check: if no visible data, return null
  if (visibleData.length === 0) {
    return null;
  }

  // Calculate data range with 25% padding for better centering
  const dataMin = Math.min(...visibleData);
  const dataMax = Math.max(...visibleData);
  const dataRange = dataMax - dataMin || 1;
  const padding = dataRange * 0.25; // 25% padding (12.5% above and below)
  const minValue = dataMin - padding;
  const maxValue = dataMax + padding;
  const range = maxValue - minValue || 1;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Scale data to chart coordinates (only visible data)
  const points: ChartPoint[] = visibleData.map((value, index) => {
    const x = paddingHorizontal + (index / (visibleData.length - 1 || 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((value - minValue) / range) * chartHeight;
    return { x, y };
  });

  // Safety check: ensure points array is not empty
  if (points.length === 0) {
    return null;
  }

  // Create polyline points string
  const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

  const findClosestPoint = React.useCallback((locationX: number) => {
    if (!onPointSelect || points.length === 0 || visibleData.length === 0) return;
    
    // Ensure locationX is within chart bounds
    if (locationX < paddingHorizontal || locationX > width - paddingHorizontal) {
      return;
    }
    
    // Find closest point in visible data
    let closestIndex = 0;
    let minDistance = Math.abs(points[0].x - locationX);
    
    points.forEach((point, index) => {
      const distance = Math.abs(point.x - locationX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    // More lenient threshold for selection (half the distance between points)
    const threshold = chartWidth / visibleData.length / 2;
    if (minDistance < threshold && closestIndex >= 0 && closestIndex < visibleData.length) {
      const actualIndex = startIndex + closestIndex; // Map to full data array index
      setSelectedIndex(closestIndex);
      onPointSelect(actualIndex, visibleData[closestIndex]);
    }
  }, [onPointSelect, points, chartWidth, visibleData.length, visibleData, startIndex, width, paddingHorizontal]);

  const handleTouch = (event: any) => {
    let locationX: number;
    if (Platform.OS === 'web') {
      const rect = event.currentTarget?.getBoundingClientRect?.();
      const clientX = event.nativeEvent?.clientX || event.nativeEvent?.offsetX || 0;
      locationX = rect ? clientX - rect.left : clientX;
    } else {
      locationX = event.nativeEvent?.locationX || 0;
    }
    findClosestPoint(locationX);
  };

  // Ensure we have valid dimensions
  if (!width || !height || width <= 0 || height <= 0) {
    console.warn('⚠️ [iOS] SimpleLineChart: Invalid dimensions', { width, height });
    return null;
  }

  console.log('📊 [iOS] SimpleLineChart rendering:', { 
    dataLength: data.length, 
    visibleDataLength: visibleData.length,
    width, 
    height,
    chartWidth,
    chartHeight
  });

  // Use TouchableWithoutFeedback for tap/point selection on all platforms.
  // PanResponder conflicts with ScrollView on iOS and blocks taps. TouchableWithoutFeedback works.
  // pointerEvents="box-only" ensures the View (not SVG) receives touches so onPress fires on iOS.
  const chartSvg = (
    <View pointerEvents="box-only" style={{ position: 'relative', overflow: 'visible', width: '100%', height: height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
              <Defs>
                <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
                  <Stop offset="100%" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + chartHeight * (1 - ratio);
                const value = minValue + range * ratio;
                return (
                  <React.Fragment key={i}>
                    <Line
                      x1={paddingHorizontal}
                      y1={y}
                      x2={width - paddingHorizontal}
                      y2={y}
                      stroke={gridColor}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    {showYAxis && (
                      <SvgText
                        x={paddingHorizontal - 10}
                        y={y + 4}
                        fontSize="10"
                        fill={labelColor}
                        textAnchor="end"
                        fontFamily={Platform.OS === 'web' ? "Inter, Inter-Regular, sans-serif" : "Inter-Regular"}
                      >
                        {Math.round(value).toLocaleString()}
                      </SvgText>
                    )}
                  </React.Fragment>
                );
              })}
              {/* Area fill */}
              {fill && points.length > 0 && points[0] && points[points.length - 1] && (
                <Path
                  d={[
                    `M ${points[0].x} ${paddingTop + chartHeight}`,
                    ...points.map((p) => `L ${p.x} ${p.y}`),
                    `L ${points[points.length - 1].x} ${paddingTop + chartHeight}`,
                    'Z',
                  ].join(' ')}
                  fill="url(#areaFill)"
                />
              )}
              {/* Line chart */}
              <Polyline
                points={pointsString}
                fill="none"
                stroke={color}
                strokeWidth={String(strokeWidth)}
              />
              {/* Data points */}
              {showPoints &&
                points.map((point, index) => (
                  <Circle key={index} cx={point.x} cy={point.y} r="3" fill={color} />
                ))}
              {/* Selected point indicator */}
              {selectedIndex !== null && selectedIndex >= 0 && selectedIndex < points.length && points[selectedIndex] && (
                <>
                  <Circle
                    cx={points[selectedIndex].x}
                    cy={points[selectedIndex].y}
                    r="5"
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <Line
                    x1={points[selectedIndex].x}
                    y1={0}
                    x2={points[selectedIndex].x}
                    y2={height}
                    stroke={color}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity={0.3}
                  />
                </>
              )}
              {/* X-axis labels */}
              {visibleLabels && visibleLabels.map((label, index) => {
                let shouldShow = false;
                if (visibleLabels.length <= 5) {
                  shouldShow = true;
                } else {
                  const totalLabels = visibleLabels.length;
                  const labelsToShow = 5;
                  const indicesToShow: number[] = [];
                  for (let i = 0; i < labelsToShow; i++) {
                    const ratio = i / (labelsToShow - 1);
                    const targetIndex = Math.round(ratio * (totalLabels - 1));
                    indicesToShow.push(targetIndex);
                  }
                  const uniqueIndices = [...new Set(indicesToShow)].sort((a, b) => a - b);
                  shouldShow = uniqueIndices.includes(index);
                }
                if (!shouldShow) return null;
                let x: number;
                if (visibleLabels.length === 1) {
                  x = width / 2;
                } else {
                  const ratio = index / (visibleLabels.length - 1);
                  const labelPadding = 20;
                  x = labelPadding + (ratio * (chartWidth - labelPadding * 2));
                }
                return (
                  <SvgText
                    key={startIndex + index}
                    x={x}
                    y={height - 8}
                    fontSize="10"
                    fill="rgba(0, 0, 0, 0.5)"
                    textAnchor="middle"
                    fontFamily={Platform.OS === 'web' ? "Inter, Inter-Regular, sans-serif" : "Inter-Regular"}
                    fontWeight="500"
                  >
                    {label.toUpperCase()}
                  </SvgText>
                );
              })}
            </Svg>
          </View>
  );

  return (
    <View style={[styles.container, { width, height }]}>
      <TouchableWithoutFeedback onPress={handleTouch} onPressIn={handleTouch}>
        {chartSvg}
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent', // Ensure container is visible
  },
});
