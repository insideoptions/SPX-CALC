import React, { useState, useEffect } from "react";
import { useAuth } from "./GoogleAuthContext";
import TradeForm from "./TradeForm";
import { fetchTrades, createTrade, updateTrade, deleteTrade } from "./api";
import "./TradeLedger.css";

// Trade interface
export interface Trade {
  id: string;
  userId: string;
  userEmail: string;
  tradeDate: string;
  entryDate: string;
  exitDate?: string;
  level: string;
  contractQuantity: number;
  entryPremium: number;
  exitPremium?: number;
  tradeType: "IRON_CONDOR" | "PUT_SPREAD" | "CALL_SPREAD";
  strikes: {
    sellPut: number;
    buyPut: number;
    sellCall: number;
    buyCall: number;
  };
  status: "OPEN" | "CLOSED" | "EXPIRED";
  pnl?: number;
  fees: number;
  notes?: string;
  isAutoPopulated: boolean;
  matrix: string;
  buyingPower: string;
}

// Props for the component
interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "CLOSED">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState<"date" | "level" | "pnl">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch trades on component mount
  useEffect(() => {
    if (user?.email) {
      loadTrades();
    }
  }, [user]);

  // Load trades from API
  const loadTrades = async () => {
    try {
      setLoading(true);
      if (user?.email) {
        const data = await fetchTrades(user.email);
        console.log("Loaded trades:", data);
        setTrades(data);
        if (onTradeUpdate) {
          onTradeUpdate(data);
        }
      }
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new trade
  const addTrade = async (tradeData: Partial<Trade>) => {
    try {
      console.log("Adding new trade (improved):", tradeData);
      // Ensure status is one of the allowed values
      let status: "OPEN" | "CLOSED" | "EXPIRED" = "OPEN";
      if (
        tradeData.status &&
        ["OPEN", "CLOSED", "EXPIRED"].includes(tradeData.status as string)
      ) {
        status = tradeData.status as "OPEN" | "CLOSED" | "EXPIRED";
      }

      // Create a properly typed new trade object
      const newTrade: Omit<Trade, "id"> = {
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate:
          tradeData.tradeDate || new Date().toISOString().split("T")[0],
        entryDate: new Date().toISOString(),
        level: tradeData.level || "Level 2",
        contractQuantity: tradeData.contractQuantity || 1,
        entryPremium: tradeData.entryPremium || 0,
        exitPremium: tradeData.exitPremium,
        tradeType: tradeData.tradeType || "IRON_CONDOR",
        strikes: tradeData.strikes || {
          sellPut: 0,
          buyPut: 0,
          sellCall: 0,
          buyCall: 0,
        },
        status: status,
        pnl: tradeData.pnl,
        fees: tradeData.fees || 6.56,
        notes: tradeData.notes,
        isAutoPopulated: false,
        matrix: tradeData.matrix || "standard",
        buyingPower: tradeData.buyingPower || "$26,350",
      };

      // Generate a local ID for immediate UI update
      const localId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      const localTrade: Trade = {
        ...(newTrade as any),
        id: localId,
      };

      // Update UI immediately
      setTrades([...trades, localTrade]);
      setShowAddTrade(false);

      // Then send to API
      const createdTrade = await createTrade(newTrade);
      if (createdTrade) {
        // Replace local trade with server version
        setTrades((currentTrades: Trade[]) =>
          currentTrades.map((t: Trade) => (t.id === localId ? createdTrade : t))
        );
      }
    } catch (error) {
      console.error("Error adding trade:", error);
      alert("Failed to add trade. Please try again.");
    }
  };

  // Update an existing trade
  const updateExistingTrade = async (tradeData: Partial<Trade>) => {
    if (!tradeData.id) return;

    try {
      console.log("Updating trade:", tradeData);
      // Ensure all required properties are present before updating
      if (
        typeof tradeData.status === "string" &&
        !["OPEN", "CLOSED", "EXPIRED"].includes(tradeData.status as string)
      ) {
        // Fix any invalid status values
        tradeData.status = "OPEN" as "OPEN" | "CLOSED" | "EXPIRED";
      }

      // Cast to Trade type for the API call
      const updatedTrade = await updateTrade(tradeData as Trade);
      if (updatedTrade) {
        setTrades(
          trades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
        );
        setEditingTrade(null);
      }
    } catch (error) {
      console.error("Error updating trade:", error);
    }
  };

  // Delete a trade
  const removeTrade = async (tradeId: string) => {
    try {
      console.log("Deleting trade:", tradeId);
      const success = await deleteTrade(tradeId);
      if (success) {
        setTrades(trades.filter((t) => t.id !== tradeId));
      }
    } catch (error) {
      console.error("Error deleting trade:", error);
    }
  };

  // Calculate P&L for a trade
  const calculatePnL = (trade: Trade): number => {
    if (trade.status === "OPEN" || !trade.exitPremium) {
      return 0;
    }

    const grossPnL =
      (trade.entryPremium - trade.exitPremium) * trade.contractQuantity * 100;
    return grossPnL - trade.fees;
  };

  // Filter and sort trades
  const filteredAndSortedTrades = trades
    .filter((trade) => {
      if (filterStatus === "ALL") return true;
      return trade.status === filterStatus;
    })
    .sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "date":
          compareValue =
            new Date(b.tradeDate).getTime() - new Date(a.tradeDate).getTime();
          break;
        case "level":
          compareValue =
            parseInt(a.level.replace("Level ", "")) -
            parseInt(b.level.replace("Level ", ""));
          break;
        case "pnl":
          compareValue = (b.pnl || 0) - (a.pnl || 0);
          break;
      }

      return sortOrder === "asc" ? -compareValue : compareValue;
    });

  // Calculate summary statistics
  const calculateStats = () => {
    const openTrades = trades.filter((t) => t.status === "OPEN").length;
    const closedTrades = trades.filter((t) => t.status === "CLOSED").length;
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = trades.filter((t) => (t.pnl || 0) > 0).length;
    const losingTrades = trades.filter((t) => (t.pnl || 0) < 0).length;
    const winRate =
      closedTrades > 0
        ? ((winningTrades / closedTrades) * 100).toFixed(1)
        : "0";

    return {
      openTrades,
      closedTrades,
      totalPnL,
      winningTrades,
      losingTrades,
      winRate,
    };
  };

  const stats = calculateStats();

  // Render loading state
  if (loading) {
    return (
      <div className="trade-ledger-loading">
        <div className="loading-spinner"></div>
        <p>Loading your trades...</p>
      </div>
    );
  }

  return (
    <div className="trade-ledger-container">
      {/* Header Section */}
      <div className="trade-ledger-header">
        <h2>Trade Ledger</h2>
        <button
          className="add-trade-button"
          onClick={() => setShowAddTrade(true)}
        >
          + Add Trade
        </button>
      </div>

      {/* Stats Summary */}
      <div className="trade-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total P&L</div>
          <div
            className={`stat-value ${stats.totalPnL >= 0 ? "profit" : "loss"}`}
          >
            ${stats.totalPnL.toFixed(2)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value">{stats.winRate}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value">{trades.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Winning Trades</div>
          <div className="stat-value">{stats.winningTrades}</div>
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="trade-ledger-controls">
        <div className="filter-group">
          <label>Filter:</label>
          <select
            value={filterStatus}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilterStatus(e.target.value as "ALL" | "OPEN" | "CLOSED")
            }
            className="filter-select"
          >
            <option value="ALL">All Trades</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="sort-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSortBy(e.target.value as "date" | "level" | "pnl")
            }
            className="sort-select"
          >
            <option value="date">Date</option>
            <option value="level">Level</option>
            <option value="pnl">P&L</option>
          </select>
          <button
            className="sort-order-button"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="trades-table-container">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Level</th>
              <th>Type</th>
              <th>Contracts</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>Status</th>
              <th>P&L</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTrades.map((trade) => (
              <tr
                key={trade.id}
                className={trade.status === "OPEN" ? "open-trade" : ""}
              >
                <td>{new Date(trade.tradeDate).toLocaleDateString()}</td>
                <td>
                  <span
                    className={`level-badge level-${trade.level
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {trade.level}
                  </span>
                </td>
                <td>{trade.tradeType.replace("_", " ")}</td>
                <td>{trade.contractQuantity}</td>
                <td>${trade.entryPremium.toFixed(2)}</td>
                <td>
                  {trade.exitPremium ? `$${trade.exitPremium.toFixed(2)}` : "-"}
                </td>
                <td>
                  <span
                    className={`status-badge status-${trade.status.toLowerCase()}`}
                  >
                    {trade.status}
                  </span>
                </td>
                <td className={trade.pnl && trade.pnl >= 0 ? "profit" : "loss"}>
                  {trade.pnl ? `$${trade.pnl.toFixed(2)}` : "-"}
                </td>
                <td>
                  <button
                    className="action-button edit"
                    onClick={() => setEditingTrade(trade)}
                  >
                    Edit
                  </button>
                  {trade.status === "OPEN" && (
                    <button
                      className="action-button close"
                      onClick={() => {
                        // Create a copy of the trade with updated status
                        const tradeToClose: Trade = {
                          ...trade,
                          status: "CLOSED",
                          exitDate: new Date().toISOString(),
                        };
                        setEditingTrade(tradeToClose);
                      }}
                    >
                      Close
                    </button>
                  )}
                  <button
                    className="action-button delete"
                    onClick={() => removeTrade(trade.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedTrades.length === 0 && (
          <div className="no-trades">
            <p>No trades found. Start by adding your first trade!</p>
          </div>
        )}
      </div>

      {/* Trade Form Modal */}
      {showAddTrade && (
        <div
          className="modal-overlay"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            // Close modal when clicking outside the content
            if (e.target === e.currentTarget) {
              setShowAddTrade(false);
            }
          }}
        >
          <div className="modal-content">
            <TradeForm
              onSave={(tradeData: Partial<Trade>) => {
                console.log("Trade form submitted with data:", tradeData);
                addTrade(tradeData);
              }}
              onCancel={() => setShowAddTrade(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {editingTrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TradeForm
              trade={editingTrade}
              onSave={updateExistingTrade}
              onCancel={() => setEditingTrade(null)}
              isClosing={
                editingTrade.status === "CLOSED" && !editingTrade.exitDate
              }
            />
          </div>
        </div>
      )}

      {/* Mobile View - Cards */}
      <div className="trades-mobile-view">
        {filteredAndSortedTrades.map((trade) => (
          <div key={trade.id} className="trade-card-mobile">
            <div className="trade-card-header">
              <span
                className={`level-badge level-${trade.level
                  .toLowerCase()
                  .replace(" ", "-")}`}
              >
                {trade.level}
              </span>
              <span
                className={`status-badge status-${trade.status.toLowerCase()}`}
              >
                {trade.status}
              </span>
            </div>

            <div className="trade-card-details">
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span>{new Date(trade.tradeDate).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Contracts:</span>
                <span>{trade.contractQuantity}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Entry/Exit:</span>
                <span>
                  ${trade.entryPremium.toFixed(2)} /
                  {trade.exitPremium
                    ? ` $${trade.exitPremium.toFixed(2)}`
                    : " -"}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">P&L:</span>
                <span
                  className={trade.pnl && trade.pnl >= 0 ? "profit" : "loss"}
                >
                  {trade.pnl ? `$${trade.pnl.toFixed(2)}` : "-"}
                </span>
              </div>
            </div>

            <div className="trade-card-actions">
              <button onClick={() => setEditingTrade(trade)}>Edit</button>
              {trade.status === "OPEN" && (
                <button
                  onClick={() => {
                    // Create a properly typed trade object for closing
                    const tradeToClose: Trade = {
                      ...trade,
                      status: "CLOSED",
                      exitDate: new Date().toISOString(),
                    };
                    setEditingTrade(tradeToClose);
                  }}
                >
                  Close Trade
                </button>
              )}
              <button onClick={() => removeTrade(trade.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TradeLedger;
