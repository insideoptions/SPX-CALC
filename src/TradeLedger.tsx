import React, { useState, useEffect } from "react";
import { useAuth } from "./GoogleAuthContext";
import "./TradeLedger.css";

// Trade interface matching the Excel template functionality
export interface Trade {
  id: string;
  userId: string;
  userEmail: string;
  tradeDate: string;
  level: string; // Level 2, 3, 4, 5, 6, 7
  putStrike: number;
  callStrike: number;
  quantity: number;
  premium: number;
  openingFee: number;
  optimization: "No Optimization" | "Full IC" | "Put Only" | "Call Only";
  closingFee: number;
  closingPremium?: number;
  nextDaySpxClose?: number;
  profitLoss?: number;
  status: "OPEN" | "CLOSED";
  matrix: string;
  buyingPower: string;
}

interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">(
    "ALL"
  );
  const [initialCapital, setInitialCapital] = useState(30000);
  const [currentSpxPrice, setCurrentSpxPrice] = useState<number | null>(null);

  // Mock data for testing
  useEffect(() => {
    if (user?.email) {
      // Mock SPX price
      setCurrentSpxPrice(5888.55);

      // Mock trades for demonstration
      const mockTrades: Trade[] = [
        {
          id: "1",
          userId: user.id,
          userEmail: user.email,
          tradeDate: new Date(
            Date.now() - 2 * 24 * 60 * 60 * 1000
          ).toISOString(),
          level: "Level 2",
          putStrike: 5850,
          callStrike: 5920,
          quantity: 1,
          premium: 1.75,
          openingFee: 6.56,
          optimization: "No Optimization",
          closingFee: 0,
          nextDaySpxClose: 5890,
          profitLoss: 168.44,
          status: "CLOSED",
          matrix: "standard",
          buyingPower: "$26,350",
        },
        {
          id: "2",
          userId: user.id,
          userEmail: user.email,
          tradeDate: new Date().toISOString(),
          level: "Level 3",
          putStrike: 5840,
          callStrike: 5935,
          quantity: 5,
          premium: 1.8,
          openingFee: 32.8,
          optimization: "No Optimization",
          closingFee: 0,
          status: "OPEN",
          matrix: "standard",
          buyingPower: "$26,350",
        },
      ];

      setTrades(mockTrades);
      setLoading(false);
    }
  }, [user]);

  // Calculate summary metrics
  const calculateMetrics = () => {
    const closedTrades = trades.filter((t) => t.status === "CLOSED");
    const openTrades = trades.filter((t) => t.status === "OPEN");

    const totalPnL = trades.reduce(
      (sum, trade) => sum + (trade.profitLoss || 0),
      0
    );
    const winningTrades = closedTrades.filter(
      (t) => (t.profitLoss || 0) > 0
    ).length;
    const losingTrades = closedTrades.filter(
      (t) => (t.profitLoss || 0) < 0
    ).length;
    const winRate =
      closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;
    const roi = (totalPnL / initialCapital) * 100;
    const avgDailyEarnings =
      closedTrades.length > 0 ? totalPnL / closedTrades.length : 0;

    return {
      totalPnL,
      roi,
      winRate,
      winningTrades,
      losingTrades,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      avgDailyEarnings,
    };
  };

  const metrics = calculateMetrics();

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    const levelMatch = filterLevel === "ALL" || trade.level === filterLevel;
    const statusMatch = filterStatus === "ALL" || trade.status === filterStatus;
    return levelMatch && statusMatch;
  });

  if (loading) {
    return (
      <div className="ledger-loading">
        <div className="loading-spinner"></div>
        <p>Loading trade ledger...</p>
      </div>
    );
  }

  return (
    <div className="ledger-container">
      {/* Header with Key Metrics */}
      <div className="ledger-header">
        <h1>Trade Ledger</h1>
        <div className="header-actions">
          <button
            className="settings-btn"
            onClick={() => {
              const capital = prompt(
                "Enter initial capital:",
                initialCapital.toString()
              );
              if (capital && !isNaN(Number(capital))) {
                setInitialCapital(Number(capital));
              }
            }}
          >
            ⚙️
          </button>
          <button
            className="add-trade-btn"
            onClick={() => setShowAddTrade(true)}
          >
            + Add Trade
          </button>
        </div>
      </div>

      {/* Live SPX Price Card */}
      <div className="spx-price-card">
        <div className="spx-content">
          <span className="spx-label">SPX</span>
          <span className="spx-value">
            {currentSpxPrice?.toLocaleString() || "---"}
          </span>
          <span className="spx-time">Live Price</span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-header">
            <span className="metric-label">Total P&L</span>
            <span className="metric-period">All Time</span>
          </div>
          <div
            className={`metric-value large ${
              metrics.totalPnL >= 0 ? "profit" : "loss"
            }`}
          >
            ${metrics.totalPnL.toFixed(2)}
          </div>
          <div className="metric-subtitle">
            {metrics.roi >= 0 ? "+" : ""}
            {metrics.roi.toFixed(2)}% ROI
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Win Rate</span>
          </div>
          <div className="metric-value">{metrics.winRate.toFixed(1)}%</div>
          <div className="metric-subtitle">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Open Trades</span>
          </div>
          <div className="metric-value">{metrics.openTrades}</div>
          <div className="metric-subtitle">{metrics.closedTrades} Closed</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg Daily</span>
          </div>
          <div
            className={`metric-value ${
              metrics.avgDailyEarnings >= 0 ? "profit" : "loss"
            }`}
          >
            ${metrics.avgDailyEarnings.toFixed(2)}
          </div>
          <div className="metric-subtitle">Per Trade</div>
        </div>
      </div>

      {/* Filters */}
      <div className="ledger-filters">
        <div className="filter-group">
          <label>Level</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
          >
            <option value="ALL">All Levels</option>
            <option value="Level 2">Level 2</option>
            <option value="Level 3">Level 3</option>
            <option value="Level 4">Level 4</option>
            <option value="Level 5">Level 5</option>
            <option value="Level 6">Level 6</option>
            <option value="Level 7">Level 7</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="ALL">All</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Trades List */}
      <div className="trades-list">
        {filteredTrades.map((trade) => (
          <div
            key={trade.id}
            className={`trade-card ${trade.status.toLowerCase()}`}
          >
            <div className="trade-header">
              <div className="trade-date">
                {new Date(trade.tradeDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div
                className={`trade-level level-${trade.level
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {trade.level}
              </div>
              <div
                className={`trade-status status-${trade.status.toLowerCase()}`}
              >
                {trade.status}
              </div>
            </div>

            <div className="trade-strikes">
              <div className="strike-item">
                <span className="strike-type">PUT</span>
                <span className="strike-value">{trade.putStrike}</span>
              </div>
              <div className="strike-divider">/</div>
              <div className="strike-item">
                <span className="strike-type">CALL</span>
                <span className="strike-value">{trade.callStrike}</span>
              </div>
            </div>

            <div className="trade-details">
              <div className="detail-group">
                <span className="detail-label">Contracts</span>
                <span className="detail-value">{trade.quantity}</span>
              </div>
              <div className="detail-group">
                <span className="detail-label">Premium</span>
                <span className="detail-value">
                  ${trade.premium.toFixed(2)}
                </span>
              </div>
              <div className="detail-group">
                <span className="detail-label">Optimization</span>
                <span className="detail-value">
                  {trade.optimization.replace(" Only", "")}
                </span>
              </div>
              {trade.status === "CLOSED" && (
                <div className="detail-group">
                  <span className="detail-label">P&L</span>
                  <span
                    className={`detail-value ${
                      trade.profitLoss! >= 0 ? "profit" : "loss"
                    }`}
                  >
                    ${trade.profitLoss?.toFixed(2) || "0.00"}
                  </span>
                </div>
              )}
            </div>

            <div className="trade-actions">
              <button
                className="action-btn"
                onClick={() => setEditingTrade(trade)}
              >
                Edit
              </button>
              {trade.status === "OPEN" && (
                <button className="action-btn primary">Close Trade</button>
              )}
            </div>
          </div>
        ))}

        {filteredTrades.length === 0 && (
          <div className="no-trades">
            <p>No trades found</p>
            <button
              className="add-trade-btn"
              onClick={() => setShowAddTrade(true)}
            >
              Add Your First Trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeLedger;
