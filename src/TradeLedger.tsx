import React, { useState, useEffect, useRef } from "react";
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
  spxClosePrice?: number;
  isMaxProfit?: boolean;
  seriesId?: string;
}

interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All Trades");
  const [sortBy, setSortBy] = useState<string>("Date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Fetch trades from AWS database
  useEffect(() => {
    const loadTrades = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching trades for user:", user.email);
        const fetchedTrades = await fetchTrades(user.email);
        console.log("Trades fetched successfully:", fetchedTrades);

        setTrades(fetchedTrades);
        setLastSyncTime(new Date());

        // If there's a callback for trade updates, call it
        if (onTradeUpdate) {
          onTradeUpdate(fetchedTrades);
        }
      } catch (err) {
        console.error("Error loading trades:", err);
        setError("Failed to load trades. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTrades();

    // Set up automatic refresh every 30 seconds
    const interval = setInterval(loadTrades, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [user, onTradeUpdate]); // Also refresh when user changes

  // Calculate statistics
  const calculateStats = () => {
    const totalTrades = trades.length;
    let totalPnl = 0;
    let winningTrades = 0;

    trades.forEach((trade) => {
      if (trade.pnl) {
        totalPnl += trade.pnl;
        if (trade.pnl > 0) {
          winningTrades++;
        }
      }
    });

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalPnl,
      winRate,
      totalTrades,
      winningTrades,
    };
  };

  // Apply filters and sorting
  const getFilteredAndSortedTrades = () => {
    let filtered = [...trades];

    // Apply filter
    if (filterType !== "All Trades") {
      filtered = filtered.filter((trade) => trade.status === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "Date":
          comparison =
            new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
          break;
        case "Level":
          comparison =
            parseInt(a.level.replace("Level ", "")) -
            parseInt(b.level.replace("Level ", ""));
          break;
        case "P&L":
          comparison = (a.pnl || 0) - (b.pnl || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  // Group trades by series
  const getGroupedTrades = () => {
    const filteredTrades = getFilteredAndSortedTrades();

    if (!groupBySeries) {
      return filteredTrades.map((trade) => ({ type: "trade" as const, trade }));
    }

    const seriesMap = new Map<string, Trade[]>();
    const singleTrades: Trade[] = [];

    filteredTrades.forEach((trade) => {
      if (trade.seriesId) {
        if (!seriesMap.has(trade.seriesId)) {
          seriesMap.set(trade.seriesId, []);
        }
        seriesMap.get(trade.seriesId)?.push(trade);
      } else {
        singleTrades.push(trade);
      }
    });

    const displayItems: any[] = [];

    // Add series groups
    seriesMap.forEach((seriesTrades, seriesId) => {
      const seriesPnl = seriesTrades.reduce(
        (sum, trade) => sum + (trade.pnl || 0),
        0
      );

      displayItems.push({
        type: "series",
        seriesId,
        trades: seriesTrades,
        pnl: seriesPnl,
      });

      seriesTrades.forEach((trade) => {
        displayItems.push({ type: "trade", trade });
      });
    });

    // Add single trades
    singleTrades.forEach((trade) => {
      displayItems.push({
        type: "series",
        seriesId: `single_${trade.id}`,
        trades: [trade],
        pnl: trade.pnl || 0,
      });
      displayItems.push({ type: "trade", trade });
    });

    return displayItems;
  };

  // Format functions
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toFixed(2);
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Handle save trade
  const handleSaveTrade = async (tradeData: Partial<Trade>) => {
    try {
      console.log("handleSaveTrade called with:", tradeData);
      setIsLoading(true);
      setError(null);

      // Ensure user data is included and all required fields are present
      // Extract strikes from tradeData if they exist
      const strikes = tradeData.strikes || {
        sellPut: (tradeData as any).sellPut || 0,
        buyPut: (tradeData as any).buyPut || 0,
        sellCall: (tradeData as any).sellCall || 0,
        buyCall: (tradeData as any).buyCall || 0,
      };

      // Create a properly formatted trade object with all required fields
      const newTrade: Omit<Trade, "id"> = {
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate:
          tradeData.tradeDate || new Date().toISOString().split("T")[0],
        entryDate:
          tradeData.entryDate || new Date().toISOString().split("T")[0],
        level: tradeData.level || "Level 2",
        contractQuantity: tradeData.contractQuantity || 1,
        entryPremium: tradeData.entryPremium || 0,
        tradeType: tradeData.tradeType || "IRON_CONDOR",
        strikes: strikes,
        status: tradeData.status || "OPEN",
        fees: tradeData.fees || 6.56,
        isAutoPopulated: false,
        matrix: tradeData.matrix || "standard",
        buyingPower: tradeData.buyingPower || "$26,350",
      };

      // Add optional fields if they exist
      if (tradeData.exitPremium) newTrade.exitPremium = tradeData.exitPremium;
      if (tradeData.pnl) newTrade.pnl = tradeData.pnl;
      if (tradeData.notes) newTrade.notes = tradeData.notes;
      if (tradeData.spxClosePrice)
        newTrade.spxClosePrice = tradeData.spxClosePrice;
      if (tradeData.isMaxProfit) newTrade.isMaxProfit = tradeData.isMaxProfit;
      if (tradeData.seriesId) newTrade.seriesId = tradeData.seriesId;

      // Save to AWS
      const savedTrade = await createTrade(newTrade);

      if (savedTrade) {
        // Update local state
        setTrades([...trades, savedTrade]);
        setLastSyncTime(new Date());
        setIsAddTradeModalOpen(false);

        // If there's a callback for trade updates, call it
        if (onTradeUpdate) {
          onTradeUpdate([...trades, savedTrade]);
        }
      } else {
        setError("Failed to save trade. Please try again.");
      }
    } catch (err) {
      console.error("Error saving trade:", err);
      setError("Failed to save trade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle update trade
  const handleUpdateTrade = async (tradeData: Partial<Trade>) => {
    if (!currentTrade) return;

    try {
      setIsLoading(true);
      setError(null);

      // Extract strikes from tradeData if they exist
      const strikes = tradeData.strikes || {
        sellPut: (tradeData as any).sellPut || currentTrade.strikes.sellPut,
        buyPut: (tradeData as any).buyPut || currentTrade.strikes.buyPut,
        sellCall: (tradeData as any).sellCall || currentTrade.strikes.sellCall,
        buyCall: (tradeData as any).buyCall || currentTrade.strikes.buyCall,
      };

      // Ensure ID is preserved and all required fields are present
      const updatedTrade: Trade = {
        id: currentTrade.id,
        userId: currentTrade.userId || user?.id || "",
        userEmail: currentTrade.userEmail || user?.email || "",
        tradeDate: tradeData.tradeDate || currentTrade.tradeDate,
        entryDate: tradeData.entryDate || currentTrade.entryDate,
        level: tradeData.level || currentTrade.level,
        contractQuantity:
          tradeData.contractQuantity || currentTrade.contractQuantity,
        entryPremium: tradeData.entryPremium || currentTrade.entryPremium,
        tradeType: tradeData.tradeType || currentTrade.tradeType,
        strikes: strikes,
        status: tradeData.status || currentTrade.status,
        fees: tradeData.fees || currentTrade.fees,
        isAutoPopulated: currentTrade.isAutoPopulated,
        matrix: tradeData.matrix || currentTrade.matrix,
        buyingPower: tradeData.buyingPower || currentTrade.buyingPower,
      };

      // Add optional fields if they exist
      if (
        tradeData.exitPremium !== undefined ||
        currentTrade.exitPremium !== undefined
      ) {
        updatedTrade.exitPremium =
          tradeData.exitPremium !== undefined
            ? tradeData.exitPremium
            : currentTrade.exitPremium;
      }
      if (tradeData.exitDate || currentTrade.exitDate)
        updatedTrade.exitDate = tradeData.exitDate || currentTrade.exitDate;
      if (tradeData.pnl !== undefined || currentTrade.pnl !== undefined) {
        updatedTrade.pnl =
          tradeData.pnl !== undefined ? tradeData.pnl : currentTrade.pnl;
      }
      if (tradeData.notes || currentTrade.notes)
        updatedTrade.notes = tradeData.notes || currentTrade.notes;
      if (tradeData.spxClosePrice || currentTrade.spxClosePrice)
        updatedTrade.spxClosePrice =
          tradeData.spxClosePrice || currentTrade.spxClosePrice;
      if (
        tradeData.isMaxProfit !== undefined ||
        currentTrade.isMaxProfit !== undefined
      ) {
        updatedTrade.isMaxProfit =
          tradeData.isMaxProfit !== undefined
            ? tradeData.isMaxProfit
            : currentTrade.isMaxProfit;
      }
      if (tradeData.seriesId || currentTrade.seriesId)
        updatedTrade.seriesId = tradeData.seriesId || currentTrade.seriesId;

      // Update in AWS
      const savedTrade = await updateTrade(updatedTrade);

      if (savedTrade) {
        // Update local state
        setTrades(trades.map((t) => (t.id === savedTrade.id ? savedTrade : t)));
        setLastSyncTime(new Date());
        setIsEditTradeModalOpen(false);
        setCurrentTrade(null);

        // If there's a callback for trade updates, call it
        if (onTradeUpdate) {
          onTradeUpdate(
            trades.map((t) => (t.id === savedTrade.id ? savedTrade : t))
          );
        }
      } else {
        setError("Failed to update trade. Please try again.");
      }
    } catch (err) {
      console.error("Error updating trade:", err);
      setError("Failed to update trade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const stats = calculateStats();
  const groupedTrades = getGroupedTrades();

  return (
    <div className="trade-ledger-page">
      {/* Header */}
      <div className="trade-ledger-header">
        <h1>Trade Ledger</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="add-trade-btn"
            onClick={async () => {
              setIsLoading(true);
              try {
                const fetchedTrades = await fetchTrades(user?.email || "");
                setTrades(fetchedTrades);
                setLastSyncTime(new Date());
              } catch (err) {
                setError("Failed to refresh trades.");
              } finally {
                setIsLoading(false);
              }
            }}
            style={{ backgroundColor: "#6b7280" }}
          >
            🔄 Refresh
          </button>
          <button
            className="add-trade-btn primary"
            onClick={() => setIsAddTradeModalOpen(true)}
          >
            + Add Trade
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total P&L</div>
          <div
            className={`stat-value ${
              stats.totalPnl >= 0 ? "positive" : "negative"
            }`}
          >
            ${formatCurrency(stats.totalPnl)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
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

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All Trades">All Trades</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="Date">Date</option>
            <option value="Level">Level</option>
            <option value="P&L">P&L</option>
          </select>
          <button
            className="sort-direction"
            onClick={() =>
              setSortDirection(sortDirection === "asc" ? "desc" : "asc")
            }
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </button>
        </div>

        <div className="filter-group">
          <input
            type="checkbox"
            id="group-series"
            checked={groupBySeries}
            onChange={(e) => setGroupBySeries(e.target.checked)}
          />
          <label htmlFor="group-series">Group by Series</label>
        </div>

        <div className="sync-info">Last synced: {formatTime(lastSyncTime)}</div>
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
              <th>Sell Put</th>
              <th>Sell Call</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>SPX Close</th>
              <th>Status</th>
              <th>P&L</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedTrades.map((item, index) => {
              if (item.type === "series") {
                return (
                  <tr key={`series-${item.seriesId}`} className="series-row">
                    <td colSpan={10}>
                      {item.trades.length > 1
                        ? `${item.trades.length} Trade Series`
                        : `1 Trade Series`}
                    </td>
                    <td
                      className={`series-pnl ${
                        item.pnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {formatCurrency(item.pnl)}
                    </td>
                    <td></td>
                  </tr>
                );
              } else {
                const trade = item.trade;
                return (
                  <tr key={trade.id}>
                    <td>{formatDate(trade.tradeDate)}</td>
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
                    <td>{trade.strikes.sellPut}</td>
                    <td>{trade.strikes.sellCall}</td>
                    <td>{trade.entryPremium}</td>
                    <td>{trade.exitPremium ?? "-"}</td>
                    <td>{trade.spxClosePrice ?? "-"}</td>
                    <td>{trade.status}</td>
                    <td
                      className={`${
                        trade.pnl && trade.pnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {trade.pnl !== undefined
                        ? formatCurrency(trade.pnl)
                        : "-"}
                    </td>
                    <td>
                      <button
                        className="action-btn edit"
                        onClick={() => {
                          setCurrentTrade(trade);
                          setIsEditTradeModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={async () => {
                          if (window.confirm("Delete this trade?")) {
                            try {
                              setIsLoading(true);
                              const success = await deleteTrade(
                                trade.id,
                                user.email
                              );
                              if (success) {
                                // Remove from local state
                                setTrades(
                                  trades.filter((t) => t.id !== trade.id)
                                );
                                setLastSyncTime(new Date());
                              } else {
                                setError(
                                  "Failed to delete trade. Please try again."
                                );
                              }
                            } catch (err) {
                              console.error("Error deleting trade:", err);
                              setError(
                                "Failed to delete trade. Please try again."
                              );
                            } finally {
                              setIsLoading(false);
                            }
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <div>Loading...</div>
        </div>
      )}

      {/* Modals */}
      {isAddTradeModalOpen && (
        <TradeForm
          onSave={handleSaveTrade}
          onCancel={() => setIsAddTradeModalOpen(false)}
        />
      )}

      {isEditTradeModalOpen && currentTrade && (
        <TradeForm
          trade={currentTrade}
          onSave={handleUpdateTrade}
          onCancel={() => {
            setIsEditTradeModalOpen(false);
            setCurrentTrade(null);
          }}
          isClosing={currentTrade.status === "OPEN"}
        />
      )}
    </div>
  );
};

export default TradeLedger;
