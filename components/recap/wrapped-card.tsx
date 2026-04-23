"use client";

import { forwardRef } from "react";

const GRADIENTS = [
  "linear-gradient(160deg, #D14B3D, #9E2E24)",
  "linear-gradient(160deg, #E89CB3, #D14B3D)",
  "linear-gradient(160deg, #5B7A4B, #2F4A20)",
  "linear-gradient(160deg, #B88A3B, #6E5422)",
  "linear-gradient(160deg, #1F1812, #3A2C1F)",
  "linear-gradient(160deg, #9E2E24, #1F1812)",
];

interface WrappedCardProps {
  tripName: string;
  year: string;
  title: string;
  big: string;
  sub: string;
  note?: string;
  index: number;
  total: number;
}

export const WrappedCard = forwardRef<HTMLDivElement, WrappedCardProps>(
  function WrappedCard(
    { tripName, year, title, big, sub, note, index, total },
    ref
  ) {
    const gradient = GRADIENTS[index % GRADIENTS.length];

    return (
      <div
        ref={ref}
        style={{
          width: 340,
          minHeight: 560,
          borderRadius: 28,
          padding: 32,
          background: gradient,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -30,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              marginBottom: 6,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-transparent.png"
              alt=""
              width={40}
              height={40}
              style={{ display: "block" }}
            />
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2 }}>
            {tripName}
          </div>
          <div
            style={{
              fontSize: 11,
              opacity: 0.7,
              marginTop: 4,
              letterSpacing: "0.1em",
            }}
          >
            WRAPPED · {year}
          </div>

          <div style={{ marginTop: 56 }}>
            <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: "0.1em" }}>
              {title}
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
                marginTop: 8,
                wordBreak: "break-word",
              }}
            >
              {big}
            </div>
            <div style={{ fontSize: 15, opacity: 0.85, marginTop: 6 }}>
              {sub}
            </div>
            {note && (
              <div
                style={{
                  fontSize: 13,
                  opacity: 0.7,
                  marginTop: 16,
                  lineHeight: 1.5,
                }}
              >
                {note}
              </div>
            )}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: -20,
              right: 0,
              fontSize: 10,
              opacity: 0.5,
              letterSpacing: "0.1em",
            }}
          >
            旅帳 · TABICHŌ
          </div>
        </div>

        {/* Progress dots */}
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 32,
            display: "flex",
            gap: 4,
            zIndex: 2,
          }}
        >
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 16,
                height: 3,
                borderRadius: 2,
                background:
                  i === index ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }
);
