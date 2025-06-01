import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./GoogleAuthContext";
import TradeForm from "./TradeForm";
import { fetchTrades, createTrade, updateTrade, deleteTrade } from "./api";
import "./TradeLedger.css";
import "./TradeLedger.table.css";

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

// Props for the component
interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

// Helper function to assign series IDs to trades based on common attributes
const assignSeriesToTrades = (trades: Trade[]): Trade[] => {
  if (!trades || trades.length === 0) {
    return [];
  }

  const tradesWithSeries = [...trades];
  const tradeGroups: { [key: string]: Trade[] } = {};

  tradesWithSeries.forEach((trade) => {
    const seriesKey = `${trade.tradeType}_${trade.level}_${trade.strikes.sellPut}_${trade.strikes.buyPut}_${trade.strikes.sellCall}_${trade.strikes.buyCall}`;
    if (!tradeGroups[seriesKey]) {
      tradeGroups[seriesKey] = [];
    }
    tradeGroups[seriesKey].push(trade);
  });

  Object.entries(tradeGroups).forEach(([seriesKey, groupTrades]) => {
    if (groupTrades.length > 1) {
      const sortedByDate = [...groupTrades].sort(
        (a, b) =>
          new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
      );
      const seriesId = `series_${sortedByDate[0].id}`;
      groupTrades.forEach((trade) => {
        const tradeIndex = tradesWithSeries.findIndex((t) => t.id === trade.id);
        if (tradeIndex >= 0) {
          tradesWithSeries[tradeIndex] = {
            ...tradesWithSeries[tradeIndex],
            seriesId,
          };
        }
      });
    }
  });

  return tradesWithSeries;
};

// Main component
const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All Trades");
  const [sortBy, setSortBy] = useState<string>("Date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [isSpxClosePriceModalOpen, setIsSpxClosePriceModalOpen] =
    useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [spxClosePrice, setSpxClosePrice] = useState<number | undefined>(
    undefined
  );
  const [isAwsSync, setIsAwsSync] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load trades from local storage or API
  useEffect(() => {
    if (user) {
      loadTrades();
    }
  }, [user]);

  // Apply filters and sorting
  useEffect(() => {
    if (trades.length > 0) {
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

      setFilteredTrades(filtered);
    }
  }, [trades, filterType, sortBy, sortDirection]);

  // Load trades from local storage or API
  const loadTrades = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to load from local storage first
      const localTrades = localStorage.getItem(`trades_${user?.id}`);

      if (localTrades) {
        const parsedTrades = JSON.parse(localTrades);
        setTrades(assignSeriesToTrades(parsedTrades));
      }

      // Then try to fetch from API
      if (isAwsSync) {
        await syncTrades();
      }
    } catch (err) {
      console.error("Error loading trades:", err);
      setError("Failed to load trades. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync trades with AWS
  const syncTrades = async () => {
    if (!user) return;

    try {
      setSyncStatus("Syncing with AWS...");
      const awsTrades = await fetchTrades(user.id);

      if (awsTrades) {
        const tradesWithSeries = assignSeriesToTrades(awsTrades);
        setTrades(tradesWithSeries);

        // Update local storage
        localStorage.setItem(`trades_${user.id}`, JSON.stringify(awsTrades));

        // Notify parent component if needed
        if (onTradeUpdate) {
          onTradeUpdate(tradesWithSeries);
        }

        setSyncStatus("Sync complete");
        setRetryCount(0);
      }
    } catch (err) {
      console.error("Error syncing with AWS:", err);
      setSyncStatus("Sync failed");

      // Retry logic
      if (retryCount < maxRetries) {
        setSyncStatus(`Retrying (${retryCount + 1}/${maxRetries})...`);
        setRetryCount((prev) => prev + 1);

        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }

        retryTimeoutRef.current = setTimeout(() => {
          syncTrades();
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        setSyncStatus("Sync failed after retries");
        setError("Failed to sync with AWS. Using local data.");
      }
    }
  };

  // Add a new trade
  const addTrade = async (
    trade: Omit<Trade, "id" | "userId" | "userEmail">
  ) => {
    if (!user) return;

    try {
      setSyncStatus("Adding trade...");

      // Create new trade object
      const newTrade = {
        ...trade,
        userId: user.id,
        userEmail: user.email,
      };

      // Add to AWS if sync is enabled
      if (isAwsSync) {
        const createdTrade = await createTrade(newTrade);

        if (createdTrade) {
          // Update local state
          const updatedTrades = assignSeriesToTrades([...trades, createdTrade]);
          setTrades(updatedTrades);

          // Update local storage
          localStorage.setItem(
            `trades_${user.id}`,
            JSON.stringify(updatedTrades)
          );

          // Notify parent component if needed
          if (onTradeUpdate) {
            onTradeUpdate(updatedTrades);
          }

          setSyncStatus("Trade added successfully");
        }
      } else {
        // Local only mode (for testing)
        const mockId = `local_${Date.now()}`;
        const localTrade = {
          ...newTrade,
          id: mockId,
        } as Trade;

        const updatedTrades = assignSeriesToTrades([...trades, localTrade]);
        setTrades(updatedTrades);

        // Update local storage
        localStorage.setItem(
          `trades_${user.id}`,
          JSON.stringify(updatedTrades)
        );

        // Notify parent component if needed
        if (onTradeUpdate) {
          onTradeUpdate(updatedTrades);
        }

        setSyncStatus("Trade added locally");
      }
    } catch (err) {
      console.error("Error adding trade:", err);
      setSyncStatus("Failed to add trade");
      setError("Failed to add trade. Please try again.");
    }
  };

  // Update an existing trade
  const updateTradeHandler = async (updatedTrade: Trade) => {
    if (!user) return;

    try {
      setSyncStatus("Updating trade...");

      // Update in AWS if sync is enabled
      if (isAwsSync) {
        const result = await updateTrade(updatedTrade);

        if (result) {
          // Update local state
          const updatedTrades = trades.map((t) =>
            t.id === updatedTrade.id ? updatedTrade : t
          );
          const tradesWithSeries = assignSeriesToTrades(updatedTrades);
          setTrades(tradesWithSeries);

          // Update local storage
          localStorage.setItem(
            `trades_${user.id}`,
            JSON.stringify(updatedTrades)
          );

          // Notify parent component if needed
          if (onTradeUpdate) {
            onTradeUpdate(tradesWithSeries);
          }

          setSyncStatus("Trade updated successfully");
        }
      } else {
        // Local only mode (for testing)
        const updatedTrades = trades.map((t) =>
          t.id === updatedTrade.id ? updatedTrade : t
        );
        const tradesWithSeries = assignSeriesToTrades(updatedTrades);
        setTrades(tradesWithSeries);

        // Update local storage
        localStorage.setItem(
          `trades_${user.id}`,
          JSON.stringify(updatedTrades)
        );

        // Notify parent component if needed
        if (onTradeUpdate) {
          onTradeUpdate(tradesWithSeries);
        }

        setSyncStatus("Trade updated locally");
      }
    } catch (err) {
      console.error("Error updating trade:", err);
      setSyncStatus("Failed to update trade");
      setError("Failed to update trade. Please try again.");
    }
  };

  // Delete a trade
  const deleteTradeHandler = async (tradeId: string) => {
    if (!user) return;

    try {
      setSyncStatus("Deleting trade...");

      // Delete from AWS if sync is enabled
      if (isAwsSync) {
        const result = await deleteTrade(tradeId);

        if (result) {
          // Update local state
          const updatedTrades = trades.filter((t) => t.id !== tradeId);
          const tradesWithSeries = assignSeriesToTrades(updatedTrades);
          setTrades(tradesWithSeries);

          // Update local storage
          localStorage.setItem(
            `trades_${user.id}`,
            JSON.stringify(updatedTrades)
          );

          // Notify parent component if needed
          if (onTradeUpdate) {
            onTradeUpdate(tradesWithSeries);
          }

          setSyncStatus("Trade deleted successfully");
        }
      } else {
        // Local only mode (for testing)
        const updatedTrades = trades.filter((t) => t.id !== tradeId);
        const tradesWithSeries = assignSeriesToTrades(updatedTrades);
        setTrades(tradesWithSeries);

        // Update local storage
        localStorage.setItem(
          `trades_${user.id}`,
          JSON.stringify(updatedTrades)
        );

        // Notify parent component if needed
        if (onTradeUpdate) {
          onTradeUpdate(tradesWithSeries);
        }

        setSyncStatus("Trade deleted locally");
      }
    } catch (err) {
      console.error("Error deleting trade:", err);
      setSyncStatus("Failed to delete trade");
      setError("Failed to delete trade. Please try again.");
    }
  };

  // Update SPX close price for a trade
  const updateSpxClosePrice = async () => {
    if (!selectedTradeId || spxClosePrice === undefined) return;

    try {
      const tradeToUpdate = trades.find((t) => t.id === selectedTradeId);

      if (tradeToUpdate) {
        const updatedTrade = {
          ...tradeToUpdate,
          spxClosePrice,
          status: "CLOSED" as const,
        };

        await updateTradeHandler(updatedTrade);
        setIsSpxClosePriceModalOpen(false);
        setSelectedTradeId(null);
        setSpxClosePrice(undefined);
      }
    } catch (err) {
      console.error("Error updating SPX close price:", err);
      setError("Failed to update SPX close price. Please try again.");
    }
  };

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

  // Define types for grouped trades display
  type SeriesItem = {
    type: "series";
    seriesId: string;
    trades: Trade[];
    pnl: number;
  };

  type TradeItem = {
    type: "trade";
    trade: Trade;
  };

  type DisplayItem = SeriesItem | TradeItem;

  // Group trades by series for display
  const getGroupedTrades = (): DisplayItem[] => {
    if (!groupBySeries) {
      return filteredTrades.map((trade) => ({ type: "trade" as const, trade }));
    }

    const seriesMap = new Map<string, Trade[]>();
    const singleTrades: Trade[] = [];

    // Group trades by series
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

    // Create display items
    const displayItems: DisplayItem[] = [];

    // Add series groups
    seriesMap.forEach((seriesTrades, seriesId) => {
      // Calculate total P&L for the series
      const seriesPnl = seriesTrades.reduce(
        (sum, trade) => sum + (trade.pnl || 0),
        0
      );

      // Add series header
      displayItems.push({
        type: "series" as const,
        seriesId,
        trades: seriesTrades,
        pnl: seriesPnl,
      });

      // Add individual trades in the series
      seriesTrades.forEach((trade) => {
        displayItems.push({ type: "trade" as const, trade });
      });
    });

    // Add single trades (not in any series)
    singleTrades.forEach((trade) => {
      displayItems.push({
        type: "series" as const,
        seriesId: `single_${trade.id}`,
        trades: [trade],
        pnl: trade.pnl || 0,
      });
      displayItems.push({ type: "trade" as const, trade });
    });

    return displayItems;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "decimal",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Render the component
  const stats = calculateStats();
  const groupedTrades = getGroupedTrades();

  return (
    <div className="trade-ledger-container">
      {/* Header */}
      <div className="trade-ledger-header">
        <h1 className="trade-ledger-title">Trade Ledger</h1>
        <button
          className="add-trade-button"
          onClick={() => setIsAddTradeModalOpen(true)}
        >
          + Add Trade
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-container">
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

      {/* Filter Controls */}
      <div className="filter-controls">
        <div>
          <label htmlFor="filter-dropdown">Filter: </label>
          <select
            id="filter-dropdown"
            className="filter-dropdown"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All Trades">All Trades</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-dropdown">Sort by: </label>
          <select
            id="sort-dropdown"
            className="filter-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Date">Date</option>
            <option value="Level">Level</option>
            <option value="P&L">P&L</option>
          </select>

          <span
            className="sort-direction"
            onClick={() =>
              setSortDirection(sortDirection === "asc" ? "desc" : "asc")
            }
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        </div>

        <div className="group-checkbox">
          <input
            type="checkbox"
            id="group-series"
            checked={groupBySeries}
            onChange={(e) => setGroupBySeries(e.target.checked)}
          />
          <label htmlFor="group-series">Group by Series</label>
        </div>
      </div>

      {/* Trades Table */}
      {isLoading ? (
        <div>Loading trades...</div>
      ) : error ? (
        <div>{error}</div>
      ) : filteredTrades.length === 0 ? (
        <div>No trades found. Add your first trade!</div>
      ) : (
        <table className="trade-table">
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
              if (
                item.type === "series" &&
                item.trades &&
                item.trades.length > 0
              ) {
                // Series header row
                return (
                  <tr key={`series-${item.seriesId}`} className="series-header">
                    <td colSpan={10}>
                      {item.trades.length > 1
                        ? `${item.trades.length} Trade Series`
                        : `1 Trade Series`}
                    </td>
                    <td
                      className={`series-pnl ${
                        item.pnl && item.pnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {item.pnl ? formatCurrency(item.pnl) : "0.00"}
                    </td>
                    <td></td>
                  </tr>
                );
              } else if (item.type === "trade" && item.trade) {
                // Trade row
                const trade = item.trade;
                return (
                  <tr key={`trade-${trade.id}`}>
                    <td>{new Date(trade.tradeDate).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`level-badge level-${trade.level.replace(
                          "Level ",
                          ""
                        )}`}
                      >
                        {trade.level}
                      </span>
                    </td>
                    <td>{trade.tradeType.replace("_", " ")}</td>
                    <td>{trade.contractQuantity}</td>
                    <td>{trade.strikes.sellPut}</td>
                    <td>{trade.strikes.sellCall}</td>
                    <td>{trade.entryPremium.toFixed(2)}</td>
                    <td>
                      {trade.exitPremium !== undefined
                        ? trade.exitPremium.toFixed(2)
                        : "0.00"}
                    </td>
                    <td>
                      {trade.spxClosePrice ? (
                        <span
                          className={`spx-close ${
                            trade.spxClosePrice > trade.strikes.sellCall
                              ? "above"
                              : trade.spxClosePrice < trade.strikes.sellPut
                              ? "below"
                              : ""
                          }`}
                        >
                          {trade.spxClosePrice}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge status-${trade.status.toLowerCase()}`}
                      >
                        {trade.status}
                      </span>
                    </td>
                    <td
                      className={`pnl ${
                        trade.pnl && trade.pnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {trade.pnl ? formatCurrency(trade.pnl) : "0.00"}
                    </td>
                    <td className="action-buttons">
                      <button
                        className="edit-button"
                        onClick={() => {
                          setCurrentTrade(trade);
                          setIsEditTradeModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Are you sure you want to delete this trade?"
                            )
                          ) {
                            deleteTradeHandler(trade.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              }
              return null;
            })}
          </tbody>
        </table>
      )}

      {/* Add Trade Modal */}
      {isAddTradeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Trade</h2>
            <TradeForm
              onSave={(tradeData: Partial<Trade>) => {
                addTrade(
                  tradeData as Omit<Trade, "id" | "userId" | "userEmail">
                );
                setIsAddTradeModalOpen(false);
              }}
              onCancel={() => setIsAddTradeModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {isEditTradeModalOpen && currentTrade && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Trade</h2>
            <TradeForm
              trade={currentTrade}
              onSave={(tradeData: Partial<Trade>) => {
                updateTradeHandler({ ...currentTrade, ...tradeData });
                setIsEditTradeModalOpen(false);
                setCurrentTrade(null);
              }}
              onCancel={() => {
                setIsEditTradeModalOpen(false);
                setCurrentTrade(null);
              }}
            />
          </div>
        </div>
      )}

      {/* SPX Close Price Modal */}
      {isSpxClosePriceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Enter SPX Close Price</h2>
            <div className="form-group">
              <label>SPX Close Price:</label>
              <input
                type="number"
                value={spxClosePrice || ""}
                onChange={(e) => setSpxClosePrice(parseFloat(e.target.value))}
                step="0.01"
              />
            </div>
            <div className="form-actions">
              <button onClick={updateSpxClosePrice}>Save</button>
              <button
                onClick={() => {
                  setIsSpxClosePriceModalOpen(false);
                  setSelectedTradeId(null);
                  setSpxClosePrice(undefined);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {syncStatus && <div className="sync-status">{syncStatus}</div>}
    </div>
  );
};

export default TradeLedger;
