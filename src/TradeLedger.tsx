import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./GoogleAuthContext";
import TradeForm from "./TradeForm";
import CloseTradeModal from "./CloseTradeModal";
import {
  fetchTrades,
  createTrade,
  updateTrade,
  deleteTrade,
  type Trade,
} from "./api";
import "./TradeLedger.css";
import { v4 as uuidv4 } from "uuid";

// Re-export Trade type for other components that import from TradeLedger
export type { Trade } from "./api";

// Helper function to check for consecutive days
const isConsecutiveDay = (dateStr1: string, dateStr2: string): boolean => {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  // Normalize to UTC to avoid timezone issues when comparing dates
  const utcDate1 = new Date(
    Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate())
  );
  const utcDate2 = new Date(
    Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate())
  );

  const diffTime = utcDate2.getTime() - utcDate1.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays === 1;
};

// Helper function to get numeric level
const getNumericLevel = (levelStr: string): number => {
  if (!levelStr) return 0; // Handle cases where level might be undefined or empty
  return parseInt(levelStr.replace(/Level /i, ""), 10) || 0; // Ensure it handles 'level ' case-insensitively and defaults to 0 if parsing fails
};

// Function to assign series IDs based on escalation logic
const assignEscalationSeriesIds = (incomingTrades: Trade[]): Trade[] => {
  // Sort by date (asc) then by level (asc) to correctly identify escalations
  const trades = [...incomingTrades].sort((a, b) => {
    const dateA = new Date(a.tradeDate).getTime();
    const dateB = new Date(b.tradeDate).getTime();
    if (dateA !== dateB) return dateA - dateB;

    const levelA = a.level ? getNumericLevel(a.level) : 0;
    const levelB = b.level ? getNumericLevel(b.level) : 0;
    return levelA - levelB;
  });

  const processedTrades = trades.map((t) => ({ ...t })); // Work with copies

  for (let i = 0; i < processedTrades.length; i++) {
    const currentTrade = processedTrades[i];

    if (i > 0) {
      const prevTrade = processedTrades[i - 1];

      // Ensure tradeDate and level are valid before processing
      if (
        prevTrade.tradeDate &&
        currentTrade.tradeDate &&
        prevTrade.level &&
        currentTrade.level
      ) {
        const prevLevel = getNumericLevel(prevTrade.level);
        const currentLevel = getNumericLevel(currentTrade.level);

        if (
          isConsecutiveDay(prevTrade.tradeDate, currentTrade.tradeDate) &&
          currentLevel === prevLevel + 1
        ) {
          // This is an escalation
          if (prevTrade.seriesId) {
            currentTrade.seriesId = prevTrade.seriesId;
          } else {
            // This case implies prevTrade is the start of a new series
            const newSeriesId = uuidv4();
            prevTrade.seriesId = newSeriesId;
            currentTrade.seriesId = newSeriesId;
          }
        } else {
          // Not an escalation from prevTrade, so currentTrade starts/continues its own series.
          // If currentTrade doesn't have a seriesId, assign a new one.
          if (!currentTrade.seriesId) {
            currentTrade.seriesId = uuidv4();
          }
        }
      } else {
        // Invalid data for comparison, ensure currentTrade gets a seriesId if missing
        if (!currentTrade.seriesId) {
          currentTrade.seriesId = uuidv4();
        }
      }
    } else {
      // This is the first trade in the sorted list.
      // If it doesn't have a seriesId, assign one.
      if (!currentTrade.seriesId) {
        currentTrade.seriesId = uuidv4();
      }
    }
  }
  return processedTrades;
};

interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  // Mobile detection logic
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [isCloseTradeModalOpen, setIsCloseTradeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("All Trades");
  const [sortBy, setSortBy] = useState<string>("Date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Handler for saving a closed trade
  const handleSaveClosedTrade = async (updatedTradeData: Partial<Trade>) => {
    if (!tradeToClose || !user?.email) return;

    console.log("===== CLOSE TRADE DEBUG =====");
    console.log("Original trade ID:", tradeToClose.id);
    console.log("Updated trade data:", updatedTradeData);
    console.log("Exit Premium being sent:", updatedTradeData.exitPremium);

    setIsLoading(true);
    setError(null);

    try {
      // Ensure the ID is part of the update payload
      const tradeToUpdate = {
        ...tradeToClose,
        ...updatedTradeData,
        id: tradeToClose.id,
        userId: user.id,
        userEmail: user.email,
        status: "CLOSED", // Force status to CLOSED
      };

      console.log("Final trade being sent to updateTrade:", tradeToUpdate);
      console.log("Final exitPremium value:", tradeToUpdate.exitPremium);

      const savedTrade = await updateTrade(tradeToUpdate as Trade); // Cast as Trade, assuming updateTrade expects full Trade
      console.log("Response from AWS:", savedTrade);
      console.log("Exit Premium in response:", savedTrade.exitPremium);

      if (savedTrade) {
        setTrades((prevTrades) =>
          prevTrades.map((t) => (t.id === savedTrade.id ? savedTrade : t))
        );
        setLastSyncTime(new Date());
        setIsCloseTradeModalOpen(false);
        setTradeToClose(null);
        if (onTradeUpdate) {
          onTradeUpdate(
            trades.map((t) => (t.id === savedTrade.id ? savedTrade : t))
          );
        }
      } else {
        setError("Failed to close trade. Please try again.");
      }
    } catch (err) {
      console.error("Error closing trade:", err);
      setError("Failed to close trade. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

    // // Set up automatic refresh every 30 seconds
    // const interval = setInterval(loadTrades, 30000);

    // // Clean up interval on component unmount
    // return () => clearInterval(interval);
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

  // Calculate exit premium for a trade based on SPX close price
  const calculateExitPremium = (trade: Trade): number | undefined => {
    if (trade.tradeType !== "IRON_CONDOR" || !trade.spxClosePrice)
      return undefined;

    const spx = trade.spxClosePrice;
    const sellPut = trade.strikes.sellPut;
    const sellCall = trade.strikes.sellCall;
    const buyPut = trade.buyPut || sellPut - 5;
    const buyCall = trade.buyCall || sellCall + 5;
    const spreadWidth = 5;

    // Full win: SPX between the short strikes
    if (spx >= sellPut && spx <= sellCall) {
      return 0;
    }
    // Full loss: SPX at or beyond long strikes
    else if (spx <= buyPut || spx >= buyCall) {
      return spreadWidth;
    }
    // Partial loss on put side
    else if (spx < sellPut && spx > buyPut) {
      const intrusion = sellPut - spx;
      return parseFloat(((intrusion / spreadWidth) * spreadWidth).toFixed(2));
    }
    // Partial loss on call side
    else if (spx > sellCall && spx < buyCall) {
      const intrusion = spx - sellCall;
      return parseFloat(((intrusion / spreadWidth) * spreadWidth).toFixed(2));
    }

    return undefined;
  };

  // Apply filters and sorting
  const getFilteredAndSortedTrades = () => {
    // First ensure all closed trades have exit premiums calculated
    const tradesWithExitPremiums = trades.map((trade) => {
      // Only process CLOSED trades that are missing exitPremium
      if (trade.status !== "CLOSED") return trade;
      if (trade.exitPremium !== undefined && trade.exitPremium !== null)
        return trade;

      // Calculate exit premium if missing
      const exitPremium = calculateExitPremium(trade);
      if (exitPremium !== undefined) {
        console.log(
          `Calculated exit premium for trade ${trade.id}: ${exitPremium}`
        );
        return { ...trade, exitPremium };
      }

      return trade;
    });

    // We'll use the trades with calculated exit premiums for all operations now
    let filtered = [...tradesWithExitPremiums];

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
    let workingTrades = getFilteredAndSortedTrades();
    workingTrades = assignEscalationSeriesIds(workingTrades);

    if (!groupBySeries) {
      return workingTrades.map((trade) => ({ type: "trade" as const, trade }));
    }

    // If groupBySeries is true, proceed with mapping and grouping using workingTrades
    const seriesMap = new Map<string, Trade[]>();
    const singleTrades: Trade[] = [];

    workingTrades.forEach((trade: Trade) => {
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
      console.log("===== EDIT TRADE DEBUG =====");
      console.log("Current trade:", currentTrade);
      console.log("Current trade ID:", currentTrade.id);
      console.log("Current trade level:", currentTrade.level);
      console.log("Trade data received:", tradeData);
      console.log("Trade data ID:", tradeData.id);
      console.log("Trade level being updated:", tradeData.level);
      console.log("Trade level type:", typeof tradeData.level);

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
        // Use explicit undefined checking for all fields instead of || operator
        // This prevents issues with falsey values like 0, empty strings, etc.
        userId:
          currentTrade.userId !== undefined
            ? currentTrade.userId
            : user?.id || "",
        userEmail:
          currentTrade.userEmail !== undefined
            ? currentTrade.userEmail
            : user?.email || "",
        tradeDate:
          tradeData.tradeDate !== undefined
            ? tradeData.tradeDate
            : currentTrade.tradeDate,
        entryDate:
          tradeData.entryDate !== undefined
            ? tradeData.entryDate
            : currentTrade.entryDate,
        // Always use the new level value from the form, don't do any conditional check
        level: tradeData.level || currentTrade.level,
        contractQuantity:
          tradeData.contractQuantity !== undefined
            ? tradeData.contractQuantity
            : currentTrade.contractQuantity,
        entryPremium:
          tradeData.entryPremium !== undefined
            ? tradeData.entryPremium
            : currentTrade.entryPremium,
        tradeType:
          tradeData.tradeType !== undefined
            ? tradeData.tradeType
            : currentTrade.tradeType,
        strikes: strikes,
        status:
          tradeData.status !== undefined
            ? tradeData.status
            : currentTrade.status,
        fees: tradeData.fees !== undefined ? tradeData.fees : currentTrade.fees,
        isAutoPopulated: currentTrade.isAutoPopulated,
        matrix:
          tradeData.matrix !== undefined
            ? tradeData.matrix
            : currentTrade.matrix,
        buyingPower:
          tradeData.buyingPower !== undefined
            ? tradeData.buyingPower
            : currentTrade.buyingPower,
      };

      // Add optional fields if they exist
      // Handle exitPremium more carefully to prevent loss of data
      // tradeData.exitPremium could be 0, which is a valid value but evaluates as falsy
      if (tradeData.exitPremium !== undefined) {
        updatedTrade.exitPremium = tradeData.exitPremium;
        console.log(
          "Setting exitPremium from tradeData:",
          tradeData.exitPremium
        );
      } else if (currentTrade.exitPremium !== undefined) {
        updatedTrade.exitPremium = currentTrade.exitPremium;
        console.log(
          "Setting exitPremium from currentTrade:",
          currentTrade.exitPremium
        );
      }
      // Handle exitDate with proper undefined checking
      if (
        tradeData.exitDate !== undefined ||
        currentTrade.exitDate !== undefined
      ) {
        updatedTrade.exitDate =
          tradeData.exitDate !== undefined
            ? tradeData.exitDate
            : currentTrade.exitDate;
      }
      if (tradeData.pnl !== undefined || currentTrade.pnl !== undefined) {
        updatedTrade.pnl =
          tradeData.pnl !== undefined ? tradeData.pnl : currentTrade.pnl;
      }
      // Handle notes with proper undefined checking
      if (tradeData.notes !== undefined || currentTrade.notes !== undefined) {
        updatedTrade.notes =
          tradeData.notes !== undefined ? tradeData.notes : currentTrade.notes;
      }
      // Handle spxClosePrice carefully
      if (tradeData.spxClosePrice !== undefined) {
        updatedTrade.spxClosePrice = tradeData.spxClosePrice;
      } else if (currentTrade.spxClosePrice !== undefined) {
        updatedTrade.spxClosePrice = currentTrade.spxClosePrice;
      }

      // Debug log to help troubleshoot exit premium issues
      console.log("Updating trade with:", {
        exitPremium: updatedTrade.exitPremium,
        originalExitPremium: currentTrade.exitPremium,
        newExitPremium: tradeData.exitPremium,
      });
      if (
        tradeData.isMaxProfit !== undefined ||
        currentTrade.isMaxProfit !== undefined
      ) {
        updatedTrade.isMaxProfit =
          tradeData.isMaxProfit !== undefined
            ? tradeData.isMaxProfit
            : currentTrade.isMaxProfit;
      }
      // Handle seriesId with proper undefined checking
      if (
        tradeData.seriesId !== undefined ||
        currentTrade.seriesId !== undefined
      ) {
        updatedTrade.seriesId =
          tradeData.seriesId !== undefined
            ? tradeData.seriesId
            : currentTrade.seriesId;
      }

      console.log("Final trade being sent to API:", updatedTrade);
      console.log("Final exitPremium value:", updatedTrade.exitPremium);

      // Update in AWS
      const savedTrade = await updateTrade(updatedTrade);
      console.log("Response from AWS:", savedTrade);
      console.log("Exit Premium in response:", savedTrade.exitPremium);

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

  // The handleSaveClosedTrade function is now at line 131

  // Handle delete trade - IMPROVED ERROR HANDLING
  const handleDeleteTrade = async (trade: Trade) => {
    if (window.confirm("Delete this trade?")) {
      try {
        setIsLoading(true);
        setError(null);

        console.log(
          "Attempting to delete trade:",
          trade.id,
          "for user:",
          user?.email
        );

        const success = await deleteTrade(trade.id, user?.email || "");

        if (success) {
          // Remove from local state
          const updatedTrades = trades.filter((t) => t.id !== trade.id);
          setTrades(updatedTrades);
          setLastSyncTime(new Date());

          // If there's a callback for trade updates, call it
          if (onTradeUpdate) {
            onTradeUpdate(updatedTrades);
          }

          console.log("Trade deleted successfully");
        } else {
          setError("Failed to delete trade. Please try again.");
        }
      } catch (err) {
        console.error("Error deleting trade:", err);
        setError(
          `Failed to delete trade: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoading(false);
      }
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

      {/* Responsive View - Table for Desktop, Cards for Mobile */}
      {!isMobile ? (
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
                      <td>{trade.entryPremium.toFixed(2)}</td>
                      <td>
                        {(() => {
                          // If we have an exit premium, show it
                          if (
                            trade.exitPremium !== undefined &&
                            trade.exitPremium !== null
                          ) {
                            return trade.exitPremium.toFixed(2);
                          }
                          // If trade is closed and has SPX close price, calculate exit premium on the fly
                          else if (
                            trade.status === "CLOSED" &&
                            trade.spxClosePrice
                          ) {
                            const calculatedExitPrem =
                              calculateExitPremium(trade);
                            return calculatedExitPrem !== undefined
                              ? calculatedExitPrem.toFixed(2)
                              : "0.00";
                          }
                          // Default case
                          return "0.00";
                        })()}
                      </td>
                      <td
                        className={`spx-close ${
                          trade.spxClosePrice &&
                          (trade.spxClosePrice > trade.strikes.sellCall
                            ? "breach"
                            : trade.spxClosePrice < trade.strikes.sellPut
                            ? "breach"
                            : "")
                        }`}
                      >
                        {trade.spxClosePrice || "-"}
                        {trade.isMaxProfit && (
                          <span className="check-mark">✓</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${trade.status.toLowerCase()}`}
                        >
                          {trade.status}
                        </span>
                      </td>
                      <td
                        className={`pnl ${
                          trade.pnl && trade.pnl >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {trade.pnl ? formatCurrency(trade.pnl) : "-"}
                      </td>
                      <td>
                        <button
                          className="action-btn"
                          onClick={() => {
                            setCurrentTrade(trade);
                            setIsEditTradeModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteTrade(trade)}
                        >
                          Delete
                        </button>
                        {trade.status === "OPEN" && (
                          <button
                            className="action-btn close-btn"
                            onClick={() => {
                              setTradeToClose(trade);
                              setIsCloseTradeModalOpen(true);
                            }}
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="trades-cards-container">
          {groupedTrades.map((item, index) => {
            if (item.type === "series") {
              return (
                <div
                  key={`mobile-series-${item.seriesId}`}
                  className="series-card"
                >
                  <div className="series-card-header">
                    <span className="series-title">
                      {item.trades.length > 1
                        ? `${item.trades.length} Trade Series`
                        : `1 Trade Series`}
                    </span>
                    <span
                      className={`series-pnl ${
                        item.pnl >= 0 ? "positive" : "negative"
                      }`}
                    >
                      {formatCurrency(item.pnl)}
                    </span>
                  </div>
                </div>
              );
            } else {
              const trade = item.trade;
              const isBreach =
                trade.spxClosePrice &&
                (trade.spxClosePrice > trade.strikes.sellCall ||
                  trade.spxClosePrice < trade.strikes.sellPut);

              return (
                <div key={`mobile-trade-${trade.id}`} className="trade-card">
                  <div className="trade-card-header">
                    <div className="trade-card-date-level">
                      <span className="trade-card-date">
                        {formatDate(trade.tradeDate)}
                      </span>
                      <span
                        className={`level-badge level-${trade.level
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {trade.level}
                      </span>
                    </div>
                    <span
                      className={`status-badge ${trade.status.toLowerCase()}`}
                    >
                      {trade.status}
                    </span>
                  </div>

                  <div className="trade-card-details">
                    <div className="trade-card-row">
                      <span className="trade-card-label">Type:</span>
                      <span className="trade-card-value">
                        {trade.tradeType.replace("_", " ")}
                      </span>
                    </div>
                    <div className="trade-card-row">
                      <span className="trade-card-label">Contracts:</span>
                      <span className="trade-card-value">
                        {trade.contractQuantity}
                      </span>
                    </div>
                    {trade.tradeType === "IRON_CONDOR" && (
                      <>
                        <div className="trade-card-row">
                          <span className="trade-card-label">Sell Put:</span>
                          <span className="trade-card-value">
                            {trade.strikes.sellPut}
                          </span>
                        </div>
                        <div className="trade-card-row">
                          <span className="trade-card-label">Sell Call:</span>
                          <span className="trade-card-value">
                            {trade.strikes.sellCall}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="trade-card-row">
                      <span className="trade-card-label">Entry:</span>
                      <span className="trade-card-value">
                        {trade.entryPremium.toFixed(2)}
                      </span>
                    </div>
                    {trade.status === "CLOSED" && (
                      <div className="trade-card-row">
                        <span className="trade-card-label">Exit:</span>
                        <span className="trade-card-value">
                          {(() => {
                            // If we have an exit premium, show it
                            if (
                              trade.exitPremium !== undefined &&
                              trade.exitPremium !== null
                            ) {
                              return trade.exitPremium.toFixed(2);
                            }
                            // If trade is closed and has SPX close price, calculate exit premium on the fly
                            else if (
                              trade.status === "CLOSED" &&
                              trade.spxClosePrice
                            ) {
                              const calculatedExitPrem =
                                calculateExitPremium(trade);
                              return calculatedExitPrem !== undefined
                                ? calculatedExitPrem.toFixed(2)
                                : "0.00";
                            }
                            // Default case
                            return "0.00";
                          })()}
                        </span>
                      </div>
                    )}
                    {trade.spxClosePrice && (
                      <div className="trade-card-row">
                        <span className="trade-card-label">SPX Close:</span>
                        <span
                          className={`trade-card-value ${
                            isBreach ? "breach" : ""
                          }`}
                        >
                          {trade.spxClosePrice}
                          {trade.isMaxProfit && (
                            <span className="check-mark">✓</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="trade-card-footer">
                    <div className="trade-card-pnl">
                      <span className="trade-card-label">P&L:</span>
                      <span
                        className={`trade-card-pnl-value ${
                          trade.pnl && trade.pnl >= 0 ? "positive" : "negative"
                        }`}
                      >
                        {trade.pnl ? formatCurrency(trade.pnl) : "-"}
                      </span>
                    </div>
                    <div className="trade-card-actions">
                      <button
                        className="action-btn"
                        onClick={() => {
                          setCurrentTrade(trade);
                          setIsEditTradeModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      {trade.status === "OPEN" && (
                        <button
                          className="action-btn close-btn"
                          onClick={() => {
                            setTradeToClose(trade);
                            setIsCloseTradeModalOpen(true);
                          }}
                        >
                          Close
                        </button>
                      )}
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteTrade(trade)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

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
          // isClosing prop removed as it's not for general editing
        />
      )}

      {/* Close Trade Modal */}
      {isCloseTradeModalOpen && tradeToClose && (
        <CloseTradeModal
          trade={tradeToClose}
          onClose={() => {
            setIsCloseTradeModalOpen(false);
            setTradeToClose(null);
          }}
          onSave={handleSaveClosedTrade}
        />
      )}
    </div>
  );
};

export default TradeLedger;
