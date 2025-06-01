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
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddTradeModal, setShowAddTradeModal] = useState<boolean>(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [groupBySeries, setGroupBySeries] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncInProgressRef = useRef<boolean>(false);

  // Load trades with robust handling of local and AWS data
  const loadTrades = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // First load from local storage for immediate display
      const localStorageKey = `trades_${user.email}`;
      const storedData = localStorage.getItem(localStorageKey);
      let localTrades: Trade[] = [];

      if (storedData) {
        try {
          localTrades = JSON.parse(storedData);

          // Update state with local trades immediately for fast UI response
          const tradesWithSeries = assignSeriesToTrades(localTrades);
          setTrades(tradesWithSeries);
          if (onTradeUpdate) {
            onTradeUpdate(tradesWithSeries);
          }
        } catch (error) {
          console.error("Error parsing local trades:", error);
        }
      }

      // Then fetch from AWS
      const awsTrades = await fetchTrades(user.email);

      // Merge AWS trades with local trades, preferring AWS versions
      const mergedTrades = [...localTrades];
      let hasChanges = false;

      // Update with AWS trades
      if (awsTrades && awsTrades.length > 0) {
        awsTrades.forEach((awsTrade) => {
          const localIndex = mergedTrades.findIndex(
            (t) => t.id === awsTrade.id
          );

          if (localIndex >= 0) {
            // Trade exists locally, check if it's different
            if (
              JSON.stringify(mergedTrades[localIndex]) !==
              JSON.stringify(awsTrade)
            ) {
              mergedTrades[localIndex] = awsTrade;
              hasChanges = true;
            }
          } else {
            // New trade from AWS, add it
            mergedTrades.push(awsTrade);
            hasChanges = true;
          }
        });
      }

      // Update local storage and state if there were changes
      if (hasChanges) {
        localStorage.setItem(localStorageKey, JSON.stringify(mergedTrades));

        const tradesWithSeries = assignSeriesToTrades(mergedTrades);
        setTrades(tradesWithSeries);
        if (onTradeUpdate) {
          onTradeUpdate(tradesWithSeries);
        }
      }
    } catch (error) {
      console.error("Error loading trades:", error);

      // Try local storage as fallback if API fails
      if (user?.email) {
        const storedTrades = localStorage.getItem(`trades_${user.email}`);
        if (storedTrades) {
          try {
            const parsedTrades = JSON.parse(storedTrades);
            const tradesWithSeries = assignSeriesToTrades(parsedTrades);
            setTrades(tradesWithSeries);
            if (onTradeUpdate) {
              onTradeUpdate(tradesWithSeries);
            }
          } catch (parseError) {
            console.error("Error parsing stored trades:", parseError);
          }
        }
      }
    } finally {
      setLoading(false);
      setLastSyncTime(new Date());
    }
  };

  // Sync local trades with AWS
  const syncLocalTradesWithAWS = async () => {
    if (!user?.email || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;

    try {
      // Get trades from local storage
      const localStorageKey = `trades_${user.email}`;
      const storedData = localStorage.getItem(localStorageKey);

      if (!storedData) {
        syncInProgressRef.current = false;
        return;
      }

      const localTrades: Trade[] = JSON.parse(storedData);

      // Find local-only trades (those with IDs starting with "local_" or containing "_modified")
      const localOnlyTrades = localTrades.filter(
        (trade) =>
          trade.id.startsWith("local_") || trade.id.includes("_modified")
      );

      if (localOnlyTrades.length === 0) {
        syncInProgressRef.current = false;
        return;
      }

      // Sync each local trade to AWS with retry logic
      for (const localTrade of localOnlyTrades) {
        let awsSuccess = false;
        let currentRetry = 0;
        const maxRetries = 3;

        while (currentRetry < maxRetries && !awsSuccess) {
          try {
            let awsTrade: Trade | null = null;

            if (localTrade.id.startsWith("local_")) {
              // This is a new trade that needs to be created in AWS
              awsTrade = await createTrade({
                ...localTrade,
                userEmail: user.email,
                userId: user.id || (user as any).uid || "",
              });
            } else if (localTrade.id.includes("_modified")) {
              // This is a modified trade that needs to be updated in AWS
              const originalId = localTrade.id.split("_modified")[0];
              awsTrade = await updateTrade({
                ...localTrade,
                id: originalId, // Use the original ID for the update
                userEmail: user.email,
                userId: user.id || (user as any).uid || "",
              });
            }

            if (awsTrade) {
              // Update the local trade with the AWS version
              const updatedLocalTrades = localTrades.map((trade) =>
                trade.id === localTrade.id ? awsTrade! : trade
              );

              // Update local storage and state
              localStorage.setItem(
                localStorageKey,
                JSON.stringify(updatedLocalTrades)
              );

              const updatedTradesWithSeries =
                assignSeriesToTrades(updatedLocalTrades);
              setTrades(updatedTradesWithSeries);

              if (onTradeUpdate) {
                onTradeUpdate(updatedTradesWithSeries);
              }

              awsSuccess = true;
            }
          } catch (error) {
            // Exponential backoff for retries
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, currentRetry) * 1000)
            );
          }

          currentRetry++;
        }
      }

      setLastSyncTime(new Date());
    } catch (error) {
      console.error("Error in syncLocalTradesWithAWS:", error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Fetch trades on component mount
  useEffect(() => {
    if (user?.email) {
      loadTrades();
    }
  }, [user]);

  // Set up periodic background sync
  useEffect(() => {
    if (!user?.email) return;

    // Initial sync after a short delay
    const initialSyncTimeout = setTimeout(() => {
      syncLocalTradesWithAWS();
    }, 5000);

    // Set up interval for periodic sync (every 2 minutes)
    const syncInterval = setInterval(() => {
      if (!syncInProgressRef.current && user?.email) {
        loadTrades();

        // After loading trades, sync any local changes to AWS
        setTimeout(() => {
          syncLocalTradesWithAWS();
        }, 1000);
      }
    }, 120000); // 2 minutes

    // Clean up on unmount
    return () => {
      clearTimeout(initialSyncTimeout);
      clearInterval(syncInterval);
    };
  }, [user]);

  // Save trades to local storage whenever they change
  useEffect(() => {
    if (user?.email && trades.length > 0) {
      localStorage.setItem(`trades_${user.email}`, JSON.stringify(trades));
    }
  }, [trades, user?.email]);

  // Add a new trade
  const handleAddTrade = async (newTradePartial: Partial<Trade>) => {
    if (!user?.email) {
      return;
    }

    try {
      setLoading(true);

      // Generate a local ID for immediate UI update
      const localId = `local_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Create a complete Trade object with required fields
      const newTrade: Trade = {
        id: localId,
        userId: user.id || (user as any).uid || "",
        userEmail: user.email,
        tradeDate:
          newTradePartial.tradeDate || new Date().toISOString().split("T")[0],
        entryDate:
          newTradePartial.entryDate || new Date().toISOString().split("T")[0],
        level: newTradePartial.level || "2",
        contractQuantity: newTradePartial.contractQuantity || 1,
        entryPremium: newTradePartial.entryPremium || 0,
        tradeType: newTradePartial.tradeType || "IRON_CONDOR",
        strikes: newTradePartial.strikes || {
          sellPut: 0,
          buyPut: 0,
          sellCall: 0,
          buyCall: 0,
        },
        status: newTradePartial.status || "OPEN",
        fees: newTradePartial.fees || 0,
        isAutoPopulated: newTradePartial.isAutoPopulated || false,
        matrix: newTradePartial.matrix || "",
        buyingPower: newTradePartial.buyingPower || "",
        pnl: newTradePartial.pnl,
        exitDate: newTradePartial.exitDate,
        exitPremium: newTradePartial.exitPremium,
        notes: newTradePartial.notes,
        spxClosePrice: newTradePartial.spxClosePrice,
        isMaxProfit: newTradePartial.isMaxProfit,
        seriesId: newTradePartial.seriesId,
      };

      // Update local state immediately for responsive UI
      const updatedTrades = [...trades, newTrade];
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);

      // Update local storage
      if (user.email) {
        localStorage.setItem(
          `trades_${user.email}`,
          JSON.stringify(updatedTradesWithSeries)
        );
      }

      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }

      // Sync to AWS in the background
      setTimeout(() => {
        syncLocalTradesWithAWS();
      }, 500);
    } catch (error) {
      console.error("Error adding trade:", error);
    } finally {
      setLoading(false);
      setShowAddTradeModal(false);
    }
  };

  // Update an existing trade
  const handleUpdateTrade = async (updatedTradePartial: Partial<Trade>) => {
    if (!user?.email || !tradeToEdit) {
      return;
    }

    try {
      setLoading(true);

      // Create a complete updated trade by merging the partial update with the existing trade
      const updatedTrade: Trade = {
        ...tradeToEdit,
        ...updatedTradePartial,
        // Ensure required fields are present
        id: tradeToEdit.id,
        userId: tradeToEdit.userId,
        userEmail: tradeToEdit.userEmail,
      };

      // Create a modified version with a temporary ID for local storage
      const modifiedId = `${updatedTrade.id}_modified_${Date.now()}`;
      const modifiedTrade: Trade = {
        ...updatedTrade,
        id: modifiedId,
      };

      // Update local state immediately
      const updatedTrades = trades.map((trade) =>
        trade.id === tradeToEdit.id ? modifiedTrade : trade
      );
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);

      // Update local storage
      if (user.email) {
        localStorage.setItem(
          `trades_${user.email}`,
          JSON.stringify(updatedTradesWithSeries)
        );
      }

      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }

      // Sync to AWS in the background
      setTimeout(() => {
        syncLocalTradesWithAWS();
      }, 500);
    } catch (error) {
      console.error("Error updating trade:", error);
    } finally {
      setLoading(false);
      setTradeToEdit(null);
    }
  };

  // Delete a trade
  const handleDeleteTrade = async (tradeId: string) => {
    if (!user?.email) {
      return;
    }

    try {
      setLoading(true);

      // Update local state immediately
      const updatedTrades = trades.filter((trade) => trade.id !== tradeId);
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);

      // Update local storage
      if (user.email) {
        localStorage.setItem(
          `trades_${user.email}`,
          JSON.stringify(updatedTradesWithSeries)
        );
      }

      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }

      // Delete from AWS
      await deleteTrade(tradeId);
    } catch (error) {
      console.error("Error deleting trade:", error);
      // Reload trades if delete failed to restore the deleted trade
      loadTrades();
    } finally {
      setLoading(false);
    }
  };

  // Filter trades based on selected status
  const getFilteredTrades = () => {
    if (filterStatus === "ALL") {
      return trades;
    }
    return trades.filter((trade) => trade.status === filterStatus);
  };

  // Sort trades based on selected field and direction
  const getSortedTrades = (filteredTrades: Trade[]) => {
    return [...filteredTrades].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "date":
          comparison =
            new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
          break;
        case "level":
          comparison = parseInt(a.level) - parseInt(b.level);
          break;
        case "pnl":
          comparison = (a.pnl || 0) - (b.pnl || 0);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  // Group trades by series if enabled
  const getGroupedTrades = (sortedTrades: Trade[]) => {
    if (!groupBySeries) {
      return sortedTrades;
    }

    // Group trades by seriesId
    const seriesGroups: { [key: string]: Trade[] } = {};

    sortedTrades.forEach((trade) => {
      if (trade.seriesId) {
        if (!seriesGroups[trade.seriesId]) {
          seriesGroups[trade.seriesId] = [];
        }
        seriesGroups[trade.seriesId].push(trade);
      }
    });

    // Get trades without series
    const tradesWithoutSeries = sortedTrades.filter((trade) => !trade.seriesId);

    // Flatten the grouped trades
    const groupedTrades: Trade[] = [];

    Object.values(seriesGroups).forEach((seriesTrades) => {
      groupedTrades.push(...seriesTrades);
    });

    // Add the trades without series
    groupedTrades.push(...tradesWithoutSeries);

    return groupedTrades;
  };

  // Calculate statistics
  const calculateStats = (filteredTrades: Trade[]) => {
    const totalPnl = filteredTrades.reduce(
      (sum, trade) => sum + (trade.pnl || 0),
      0
    );
    const closedTrades = filteredTrades.filter(
      (trade) => trade.status === "CLOSED"
    );
    const winningTrades = closedTrades.filter((trade) => (trade.pnl || 0) > 0);
    const winRate =
      closedTrades.length > 0
        ? (winningTrades.length / closedTrades.length) * 100
        : 0;

    return {
      totalPnl,
      winRate,
      totalTrades: filteredTrades.length,
      winningTrades: winningTrades.length,
    };
  };

  // Prepare trades for display
  const filteredTrades = getFilteredTrades();
  const sortedTrades = getSortedTrades(filteredTrades);
  const displayTrades = getGroupedTrades(sortedTrades);
  const stats = calculateStats(filteredTrades);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Toggle sort direction
  const handleSortChange = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Render series headers and calculate series totals
  const renderSeriesHeader = (seriesId: string, trades: Trade[]) => {
    const seriesPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const seriesCount = trades.length;

    return (
      <tr className="series-header">
        <td colSpan={9}>{seriesCount} Trade Series</td>
        <td
          className={`series-pnl ${seriesPnl >= 0 ? "positive" : "negative"}`}
        >
          {formatCurrency(seriesPnl)}
        </td>
        <td></td>
      </tr>
    );
  };

  // Render trade rows with series grouping
  const renderTradeRows = () => {
    if (!displayTrades.length) {
      return (
        <tr>
          <td colSpan={11} style={{ textAlign: "center", padding: "20px" }}>
            No trades found
          </td>
        </tr>
      );
    }

    const rows: JSX.Element[] = [];
    let currentSeriesId: string | null = null;
    let currentSeriesTrades: Trade[] = [];

    displayTrades.forEach((trade, index) => {
      // Handle series headers
      if (groupBySeries && trade.seriesId) {
        if (currentSeriesId !== trade.seriesId) {
          // If we have collected trades for a previous series, render its header
          if (currentSeriesId && currentSeriesTrades.length > 0) {
            rows.push(
              <React.Fragment key={`series-${currentSeriesId}`}>
                {renderSeriesHeader(currentSeriesId, currentSeriesTrades)}
              </React.Fragment>
            );
          }

          // Start a new series
          currentSeriesId = trade.seriesId;
          currentSeriesTrades = [trade];
        } else {
          // Add to current series
          currentSeriesTrades.push(trade);
        }
      }

      // Render the trade row
      rows.push(
        <tr key={trade.id}>
          <td>{new Date(trade.tradeDate).toLocaleDateString()}</td>
          <td>
            <span className={`level-badge level-${trade.level}`}>
              Level {trade.level}
            </span>
          </td>
          <td>{trade.tradeType.replace("_", " ")}</td>
          <td>{trade.contractQuantity}</td>
          <td>{trade.strikes.sellPut}</td>
          <td>{trade.strikes.sellCall}</td>
          <td>{trade.entryPremium.toFixed(2)}</td>
          <td>{trade.exitPremium?.toFixed(2) || "0.00"}</td>
          <td>
            {trade.spxClosePrice ? (
              <span
                className={`spx-close ${
                  trade.spxClosePrice > trade.strikes.sellCall
                    ? "above"
                    : "below"
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
            className={`pnl ${(trade.pnl || 0) >= 0 ? "positive" : "negative"}`}
          >
            {trade.pnl ? formatCurrency(trade.pnl) : "-"}
          </td>
          <td>
            <div className="action-buttons">
              <button
                className="edit-button"
                onClick={() => setTradeToEdit(trade)}
              >
                Edit
              </button>
              <button
                className="delete-button"
                onClick={() => handleDeleteTrade(trade.id)}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      );

      // If this is the last trade and we have a current series, render its header
      if (
        index === displayTrades.length - 1 &&
        groupBySeries &&
        currentSeriesId &&
        currentSeriesTrades.length > 0
      ) {
        rows.unshift(
          <React.Fragment key={`series-${currentSeriesId}`}>
            {renderSeriesHeader(currentSeriesId, currentSeriesTrades)}
          </React.Fragment>
        );
      }
    });

    return rows;
  };

  return (
    <div className="trade-ledger-container">
      <div className="trade-ledger-header">
        <h1 className="trade-ledger-title">Trade Ledger</h1>
        <button
          className="add-trade-button"
          onClick={() => setShowAddTradeModal(true)}
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
            {formatCurrency(stats.totalPnl)}
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
          <span>Filter: </span>
          <select
            className="filter-dropdown"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Trades</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <div className="sort-controls">
          <span>Sort by: </span>
          <select
            className="filter-dropdown"
            value={sortField}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="date">Date</option>
            <option value="level">Level</option>
            <option value="pnl">P&L</option>
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

      {/* Trade Table */}
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
          {loading ? (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", padding: "20px" }}>
                Loading trades...
              </td>
            </tr>
          ) : (
            renderTradeRows()
          )}
        </tbody>
      </table>

      {/* Add Trade Modal */}
      {showAddTradeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New Trade</h2>
            <TradeForm
              onSave={handleAddTrade}
              onCancel={() => setShowAddTradeModal(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {tradeToEdit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Trade</h2>
            <TradeForm
              trade={tradeToEdit}
              onSave={handleUpdateTrade}
              onCancel={() => setTradeToEdit(null)}
            />
          </div>
        </div>
      )}

      {/* Sync Status Indicator */}
      {lastSyncTime && (
        <div className="sync-status">
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default TradeLedger;
