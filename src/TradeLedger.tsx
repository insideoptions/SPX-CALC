import React, { useState, useEffect } from "react";
import { useAuth } from "./GoogleAuthContext";
import "./TradeLedger.css";
import { fetchTrades, createTrade, updateTrade, deleteTrade, Trade } from "./api";
import TradeForm from "./TradeForm";

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
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const fetchedTrades = await fetchTrades(user.email);
      setTrades(fetchedTrades);
      
      if (onTradeUpdate) {
        onTradeUpdate(fetchedTrades);
      }
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new trade
  const addTrade = async (tradeData: Omit<Trade, 'id'>) => {
    if (!user?.email) return;
    
    try {
      const newTrade = {
        ...tradeData,
        userId: user.id,
        userEmail: user.email
      };
      
      const createdTrade = await createTrade(newTrade);
      if (createdTrade) {
        setTrades([...trades, createdTrade]);
        setShowAddTrade(false);
        
        if (onTradeUpdate) {
          onTradeUpdate([...trades, createdTrade]);
        }
      }
    } catch (error) {
      console.error("Error adding trade:", error);
    }
  };

  // Update an existing trade
  const updateExistingTrade = async (tradeData: Trade) => {
    try {
      const updatedTrade = await updateTrade(tradeData);
      if (updatedTrade) {
        setTrades(trades.map(t => t.id === updatedTrade.id ? updatedTrade : t));
        setEditingTrade(null);
        
        if (onTradeUpdate) {
          onTradeUpdate(trades.map(t => t.id === updatedTrade.id ? updatedTrade : t));
        }
      }
    } catch (error) {
      console.error("Error updating trade:", error);
    }
  };

  // Delete a trade
  const removeTrade = async (tradeId: string) => {
    if (!user?.email) return;
    
    try {
      const success = await deleteTrade(tradeId, user.email);
      if (success) {
        const updatedTrades = trades.filter(t => t.id !== tradeId);
        setTrades(updatedTrades);
        
        if (onTradeUpdate) {
          onTradeUpdate(updatedTrades);
        }
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

  // Sort trades
  const sortedTrades = [...trades].sort((a, b) => {
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
    const totalTrades = trades.length;
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = trades.filter((t) => (t.pnl || 0) > 0).length;
    const losingTrades = trades.filter((t) => (t.pnl || 0) < 0).length;
    const winRate =
      totalTrades > 0
        ? ((winningTrades / totalTrades) * 100).toFixed(1)
        : "0";

    return {
      totalTrades,
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
          onClick={() => {
            console.log("Add Trade button clicked");
            setShowAddTrade(true);
          }}
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
          <div className="stat-value">{stats.totalTrades}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Winning Trades</div>
          <div className="stat-value">{stats.winningTrades}</div>
        </div>
      </div>

      {/* Sorting */}
      <div className="trade-ledger-controls">
        <div className="sort-group">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="date">Date</option>
            <option value="level">Level</option>
            <option value="pnl">P&L</option>
          </select>
          <button
            className="sort-order-button"
            onClick={() =>
              setSortOrder(sortOrder === "asc" ? "desc" : "asc")
            }
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Trade List */}
      {sortedTrades.length > 0 ? (
        <div className="trade-list">
          {sortedTrades.map((trade) => (
            <div
              key={trade.id}
              className="trade-card"
            >
              <div className="trade-card-header">
                <div className="trade-date">
                  {new Date(trade.tradeDate).toLocaleDateString()}
                </div>
                <div className="trade-level">{trade.level}</div>
                <div className="trade-status">{trade.status}</div>
              </div>

              <div className="trade-details">
                <div className="trade-type">
                  {trade.tradeType.replace("_", " ")}
                </div>
                <div className="trade-strikes">
                  <span>
                    P: {trade.strikes.buyPut} / {trade.strikes.sellPut}
                  </span>
                  <span>
                    C: {trade.strikes.sellCall} / {trade.strikes.buyCall}
                  </span>
                </div>
                <div className="trade-premium">
                  <div>Entry: ${trade.entryPremium.toFixed(2)}</div>
                  {trade.exitPremium && (
                    <div>Exit: ${trade.exitPremium.toFixed(2)}</div>
                  )}
                </div>
                <div className="trade-quantity">
                  {trade.contractQuantity} contract
                  {trade.contractQuantity > 1 ? "s" : ""}
                </div>
                {trade.pnl !== undefined && (
                  <div
                    className={`trade-pnl ${
                      trade.pnl >= 0 ? "profit" : "loss"
                    }`}
                  >
                    ${trade.pnl.toFixed(2)}
                  </div>
                )}
              </div>

              <div className="trade-card-footer">
                <button
                  className="edit-trade-button"
                  onClick={() => setEditingTrade(trade)}
                >
                  Edit
                </button>
                <button
                  className="delete-trade-button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this trade?"
                      )
                    ) {
                      removeTrade(trade.id);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-trades-message">
          <p>No trades found. Add your first trade to get started!</p>
        </div>
      )}

      {/* Add Trade Form Modal */}
      {showAddTrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TradeForm
              onSubmit={addTrade}
              onCancel={() => setShowAddTrade(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Trade Form Modal */}
      {editingTrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <TradeForm
              onSubmit={(tradeData) => {
                updateExistingTrade({
                  ...tradeData,
                  id: editingTrade.id
                });
              }}
              initialValues={editingTrade}
              isEditing={true}
              onCancel={() => setEditingTrade(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeLedger;
