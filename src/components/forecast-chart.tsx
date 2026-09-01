"use client";

import * as React from "react";
import type { ForecastDay } from "@/server/engines/forecast-engine";
import { formatCurrency } from "@/lib/format";

interface ForecastChartProps {
  days: ForecastDay[];
  openingBalance: number;
  currency: string;
  /** Number of historical days to show before the forecast (from actuals). */
  historicalDays?: { date: string; balance: number }[];
}

const CHART_HEIGHT = 180;
const CHART_WIDTH = 600;
const PAD_LEFT = 0;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

const INNER_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
const INNER_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

function lerp(value: number, minVal: number, maxVal: number, minOut: number, maxOut: number) {
  if (maxVal === minVal) return (minOut + maxOut) / 2;
  return minOut + ((value - minVal) / (maxVal - minVal)) * (maxOut - minOut);
}

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function buildAreaPath(
  points: { x: number; y: number }[],
  yBase: number
): string {
  if (points.length === 0) return "";
  const line = buildPath(points);
  const lastX = points[points.length - 1].x.toFixed(1);
  const firstX = points[0].x.toFixed(1);
  return `${line} L ${lastX} ${yBase.toFixed(1)} L ${firstX} ${yBase.toFixed(1)} Z`;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function shortDate(iso: string): string {
  const d = Number(iso.slice(8, 10));
  const m = Number(iso.slice(5, 7)) - 1;
  return `${d} ${MONTH_LABELS[m] ?? ""}`;
}

export function ForecastChart({
  days,
  openingBalance,
  currency,
  historicalDays = [],
}: ForecastChartProps) {
  if (days.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        No forecast data available.
      </div>
    );
  }

  // Build all balance points (historical + forecast)
  const allPoints: { date: string; balance: number; isForecast: boolean }[] = [
    ...historicalDays.map((h) => ({ ...h, isForecast: false })),
    { date: days[0].date, balance: openingBalance, isForecast: false },
    ...days.map((d, i) => ({
      date: d.date,
      balance: d.projectedBalance,
      isForecast: true,
    })),
  ];

  const allBalances = allPoints.map((p) => p.balance);
  const minBalance = Math.min(...allBalances);
  const maxBalance = Math.max(...allBalances);
  const padding = Math.max(Math.abs(maxBalance - minBalance) * 0.1, Math.abs(openingBalance) * 0.05, 1);
  const yMin = minBalance - padding;
  const yMax = maxBalance + padding;

  const totalDays = allPoints.length - 1;

  function mapX(i: number) {
    return PAD_LEFT + lerp(i, 0, totalDays, 0, INNER_W);
  }
  function mapY(balance: number) {
    return PAD_TOP + lerp(balance, yMax, yMin, 0, INNER_H);
  }

  const splitIndex = historicalDays.length; // where forecast begins
  const historicalPoints = allPoints.slice(0, splitIndex + 1).map((p, i) => ({
    x: mapX(i),
    y: mapY(p.balance),
  }));
  const forecastPoints = allPoints.slice(splitIndex).map((p, i) => ({
    x: mapX(splitIndex + i),
    y: mapY(p.balance),
  }));

  const zeroY = mapY(0);
  const clampedZeroY = Math.max(PAD_TOP, Math.min(PAD_TOP + INNER_H, zeroY));
  const showZeroLine = minBalance < 0 && maxBalance > 0;

  // Tick labels: first, middle, last
  const tickIndices = [0, Math.floor(totalDays / 2), totalDays];
  const tickLabels = tickIndices.map((i) => ({
    x: mapX(i),
    label: shortDate(allPoints[i].date),
  }));

  // Y-axis labels
  const yTicks = [yMin + (yMax - yMin) * 0.1, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.1];

  const splitX = mapX(splitIndex);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ height: CHART_HEIGHT }}
        role="img"
        aria-label="Cash flow forecast chart showing actual and projected balance"
      >
        {/* Zero line (only when range crosses zero) */}
        {showZeroLine && (
          <line
            x1={PAD_LEFT}
            y1={clampedZeroY}
            x2={CHART_WIDTH - PAD_RIGHT}
            y2={clampedZeroY}
            className="stroke-destructive/40"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* Forecast region shading */}
        {forecastPoints.length > 1 && (
          <path
            d={buildAreaPath(forecastPoints, PAD_TOP + INNER_H)}
            className="fill-primary/5"
          />
        )}

        {/* Actual/forecast split line */}
        {splitIndex > 0 && (
          <line
            x1={splitX}
            y1={PAD_TOP}
            x2={splitX}
            y2={PAD_TOP + INNER_H}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {/* Historical line */}
        {historicalPoints.length > 1 && (
          <path
            d={buildPath(historicalPoints)}
            fill="none"
            className="stroke-muted-foreground/60"
            strokeWidth={1.5}
          />
        )}

        {/* Forecast line */}
        {forecastPoints.length > 1 && (
          <path
            d={buildPath(forecastPoints)}
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            strokeDasharray={splitIndex > 0 ? "5 3" : undefined}
          />
        )}

        {/* Baseline */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP + INNER_H}
          x2={CHART_WIDTH - PAD_RIGHT}
          y2={PAD_TOP + INNER_H}
          className="stroke-border"
          strokeWidth={1}
        />

        {/* X-axis tick labels */}
        {tickLabels.map(({ x, label }) => (
          <text
            key={label}
            x={x}
            y={CHART_HEIGHT - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
            fontSize={10}
          >
            {label}
          </text>
        ))}

        {/* "Actual" / "Forecast" labels */}
        {splitIndex > 0 && splitIndex < totalDays && (
          <>
            <text
              x={splitX - 8}
              y={PAD_TOP - 2}
              textAnchor="end"
              className="fill-muted-foreground text-[9px]"
              fontSize={9}
            >
              Actual
            </text>
            <text
              x={splitX + 8}
              y={PAD_TOP - 2}
              textAnchor="start"
              className="fill-primary text-[9px]"
              fontSize={9}
            >
              Forecast
            </text>
          </>
        )}
        {splitIndex === 0 && (
          <text
            x={PAD_LEFT + 4}
            y={PAD_TOP - 2}
            textAnchor="start"
            className="fill-primary text-[9px]"
            fontSize={9}
          >
            Forecast
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
        {splitIndex > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-muted-foreground/60" />
            Actual
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-primary" />
          Projected
        </span>
      </div>
    </div>
  );
}
