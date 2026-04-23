import { forwardRef } from "react";

interface ShareableCardProps {
  tripName: string;
  startDate: string;
  endDate: string;
  totalJpy: number;
  totalTwd: number;
  count: number;
  activeDays: number;
  dailyAvgJpy: number;
  topCategoryIcon: string;
  topCategoryLabel: string;
  topStoreName: string | null;
  topStoreCount: number;
  topExpenseTitle: string;
  topExpenseJpy: number;
  totalCashback: number;
}

export const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(
  function ShareableCard(props, ref) {
    const {
      tripName,
      startDate,
      endDate,
      totalJpy,
      totalTwd,
      count,
      activeDays,
      dailyAvgJpy,
      topCategoryIcon,
      topCategoryLabel,
      topStoreName,
      topStoreCount,
      topExpenseTitle,
      topExpenseJpy,
      totalCashback,
    } = props;

    return (
      <div
        ref={ref}
        style={{
          width: 375,
          padding: 32,
          background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          borderRadius: 24,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-transparent.png"
            alt=""
            width={48}
            height={48}
            style={{ display: "block" }}
          />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          {tripName}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 24 }}>
          {startDate} ~ {endDate}
        </div>

        <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>總花費</div>
        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 2 }}>
          ¥{totalJpy.toLocaleString()}
        </div>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
          ≈ NT${totalTwd.toLocaleString()}
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 24,
            fontSize: 13,
          }}
        >
          <div>
            <div style={{ opacity: 0.7 }}>消費筆數</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{count}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7 }}>消費天數</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{activeDays}</div>
          </div>
          <div>
            <div style={{ opacity: 0.7 }}>日均消費</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              ¥{dailyAvgJpy.toLocaleString()}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 2,
          }}
        >
          <div>
            🏆 最愛類別：{topCategoryIcon} {topCategoryLabel}
          </div>
          {topStoreName && (
            <div>
              🏪 最常造訪：{topStoreName}（{topStoreCount}次）
            </div>
          )}
          <div>
            💸 最貴一筆：{topExpenseTitle} ¥{topExpenseJpy.toLocaleString()}
          </div>
          {totalCashback > 0 && (
            <div>💳 信用卡回饋：NT${totalCashback.toLocaleString()}</div>
          )}
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            opacity: 0.5,
            marginTop: 8,
          }}
        >
          旅帳 · Japan Travel Expense
        </div>
      </div>
    );
  }
);
