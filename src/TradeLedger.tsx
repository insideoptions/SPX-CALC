import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { v4 as uuidv4 } from 'uuid';

// Re-export Trade type for other components that import from TradeLedger
export type { Trade } from "./api";

// Helper function to check for consecutive days
const isConsecutiveDay = (dateStr1: string, dateStr2: string): boolean => {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  // Normalize to UTC to avoid timezone issues when comparing dates
  const utcDate1 = new Date(Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate()));
  const utcDate2 = new Date(Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate()));
  
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

  const processedTrades = trades.map(t => ({ ...t })); // Work with copies

  for (let i = 0; i < processedTrades.length; i++) {
    const currentTrade = processedTrades[i];

    if (i > 0) {
      const prevTrade = processedTrades[i-1];

      // Ensure tradeDate and level are valid before processing
      if (prevTrade.tradeDate && currentTrade.tradeDate && prevTrade.level && currentTrade.level) {
        const prevLevel = getNumericLevel(prevTrade.level);
        const currentLevel = getNumericLevel(currentTrade.level);

        if (isConsecutiveDay(prevTrade.tradeDate, currentTrade.tradeDate) && 
            currentLevel === prevLevel + 1) {
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

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
        status: "CLOSED" // Force status to CLOSED
      };
      
      console.log("Final trade being sent to updateTrade:", tradeToUpdate);
      console.log("Final exitPremium value:", tradeToUpdate.exitPremium);
      
      const savedTrade = await updateTrade(tradeToUpdate as Trade); // Cast as Trade, assuming updateTrade expects full Trade
      console.log("Response from AWS:", savedTrade);
      console.log("Exit Premium in response:", savedTrade.exitPremium);

      if (savedTrade) {
        setTrades(prevTrades => prevTrades.map(t => t.id === savedTrade.id ? savedTrade : t));
        setLastSyncTime(new Date());
        setIsCloseTradeModalOpen(false);
        setTradeToClose(null);
        if (onTradeUpdate) {
          onTradeUpdate(trades.map(t => (t.id === savedTrade.id ? savedTrade : t)));
        }
      } else {
        setError('Failed to close trade. Please try again.');
      }
    } catch (err) {
      console.error('Error closing trade:', err);
      setError('Failed to close trade. Please try again.');
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
    if (trade.tradeType !== "IRON_CONDOR" || !trade.spxClosePrice) return undefined;
    
    const spx = trade.spxClosePrice;
    const sellPut = trade.strikes.sellPut;
    const sellCall = trade.strikes.sellCall;
    const buyPut = trade.buyPut || (sellPut - 5);
    const buyCall = trade.buyCall || (sellCall + 5);
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
    const tradesWithExitPremiums = trades.map(trade => {
      // Only process CLOSED trades that are missing exitPremium
      if (trade.status !== "CLOSED") return trade;
      if (trade.exitPremium !== undefined && trade.exitPremium !== null) return trade;
      
      // Calculate exit premium if missing
      const exitPremium = calculateExitPremium(trade);
      if (exitPremium !== undefined) {
        console.log(`Calculated exit premium for trade ${trade.id}: ${exitPremium}`);
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

  // Handle update trade - COMPLETELY REWRITTEN to handle all form fields properly
  const handleUpdateTrade = async (tradeData: Partial<Trade>) => {
    console.log("%c EDIT FORM - UPDATE TRADE ", "background: blue; color: white; font-size: 16px");
    console.log("Form data received:", tradeData);
    
    if (!currentTrade) {
      console.error("ERROR: No current trade to update");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // CRITICAL FIX: Create a complete trade object with proper type handling
      // Make a copy of current trade as the base
      const updatedTrade = { ...currentTrade };
      
      // For debugging
      console.log("Original trade before update:", currentTrade);
      
      // EXPLICITLY apply each field from the form data
      // Core identification 
      updatedTrade.id = currentTrade.id; // Always preserve the ID
      updatedTrade.userId = user?.id || currentTrade.userId;
      updatedTrade.userEmail = user?.email || currentTrade.userEmail;
      
      // Basic information fields - explicitly transfer with type checking
      if (tradeData.tradeDate) updatedTrade.tradeDate = tradeData.tradeDate;
      if (tradeData.level !== undefined) updatedTrade.level = String(tradeData.level);
      if (tradeData.contractQuantity !== undefined) updatedTrade.contractQuantity = Number(tradeData.contractQuantity);
      if (tradeData.entryPremium !== undefined) updatedTrade.entryPremium = Number(tradeData.entryPremium);
      if (tradeData.tradeType) updatedTrade.tradeType = tradeData.tradeType;
      if (tradeData.fees !== undefined) updatedTrade.fees = Number(tradeData.fees);
      if (tradeData.matrix) updatedTrade.matrix = tradeData.matrix;
      if (tradeData.buyingPower) updatedTrade.buyingPower = String(tradeData.buyingPower); 
      if (tradeData.notes !== undefined) updatedTrade.notes = tradeData.notes;
      
      // Status and result fields
      if (tradeData.status) updatedTrade.status = tradeData.status;
      if (tradeData.exitDate) updatedTrade.exitDate = tradeData.exitDate;
      if (tradeData.exitPremium !== undefined) updatedTrade.exitPremium = Number(tradeData.exitPremium);
      if (tradeData.spxClosePrice !== undefined) updatedTrade.spxClosePrice = Number(tradeData.spxClosePrice);
      if (tradeData.pnl !== undefined) updatedTrade.pnl = Number(tradeData.pnl);
      if (tradeData.isMaxProfit !== undefined) updatedTrade.isMaxProfit = Boolean(tradeData.isMaxProfit);
      
      // Strike fields - handle both nested and top-level
      // Always update the nested strikes object
      updatedTrade.strikes = {
        sellPut: tradeData.sellPut !== undefined ? Number(tradeData.sellPut) : 
                (tradeData.strikes?.sellPut !== undefined ? Number(tradeData.strikes.sellPut) : updatedTrade.strikes.sellPut),
        buyPut: tradeData.buyPut !== undefined ? Number(tradeData.buyPut) : 
               (tradeData.strikes?.buyPut !== undefined ? Number(tradeData.strikes.buyPut) : updatedTrade.strikes.buyPut),
        sellCall: tradeData.sellCall !== undefined ? Number(tradeData.sellCall) : 
                 (tradeData.strikes?.sellCall !== undefined ? Number(tradeData.strikes.sellCall) : updatedTrade.strikes.sellCall),
        buyCall: tradeData.buyCall !== undefined ? Number(tradeData.buyCall) : 
                (tradeData.strikes?.buyCall !== undefined ? Number(tradeData.strikes.buyCall) : updatedTrade.strikes.buyCall)
      };
      
      // Also set top-level strike properties for compatibility
      updatedTrade.sellPut = updatedTrade.strikes.sellPut;
      updatedTrade.buyPut = updatedTrade.strikes.buyPut;
      updatedTrade.sellCall = updatedTrade.strikes.sellCall;
      updatedTrade.buyCall = updatedTrade.strikes.buyCall;
      
      // Misc fields
      if (tradeData.seriesId) updatedTrade.seriesId = tradeData.seriesId;
      if (tradeData.isAutoPopulated !== undefined) updatedTrade.isAutoPopulated = Boolean(tradeData.isAutoPopulated);
      
      // Show final object being sent to API
      console.log("%c SENDING TO API ", "background: orange; color: black; font-size: 16px");
      console.log("Final trade to update:", updatedTrade);
      
      // Send to AWS API
      const savedTrade = await updateTrade(updatedTrade);
      console.log("%c API RESPONSE ", "background: green; color: white; font-size: 16px");
      console.log("Response from API:", savedTrade);

      if (savedTrade) {
        // Update local state with the updated trade
        const updatedTrades = trades.map(t => t.id === savedTrade.id ? savedTrade : t);
        
        setTrades(updatedTrades);
        setLastSyncTime(new Date());
        setIsEditTradeModalOpen(false);
        setCurrentTrade(null);

        if (onTradeUpdate) {
          onTradeUpdate(updatedTrades);
        }
        
        console.log("%c UPDATE SUCCESSFUL ", "background: green; color: white; font-size: 16px");
        console.log("Trade updated successfully:", savedTrade.id);
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

  // The handleSaveClosedTrade function is now at line 131,

  // Handle delete trade - IMPROVED ERROR HANDLING
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Calculate trade statistics based on current trades
  const calculateStats = () => {
    if (!trades.length) return { total: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0 };
    
    const results = trades.reduce((acc: { total: number, wins: number, losses: number, totalPnL: number }, trade: Trade) => {
      acc.total += 1;
      
      const pnl = Number(trade.pnl || 0);
      if (pnl > 0) {
        acc.wins += 1;
      } else if (pnl < 0) {
        acc.losses += 1;
      }
      
      acc.totalPnL += pnl;
      return acc;
    }, { total: 0, wins: 0, losses: 0, totalPnL: 0 });
    
    results.winRate = results.total > 0 ? (results.wins / results.total) * 100 : 0;
    return results;
  };

  // Group trades by series ID for display
  const getGroupedTrades = () => {
    if (!groupBySeries) return trades;
    
    // First assign series IDs to related trades
    const tradesWithSeriesIds = assignEscalationSeriesIds([...trades]);
    
    // Then group them by series ID
    const grouped = tradesWithSeriesIds.reduce((acc: Record<string, Trade[]>, trade: Trade) => {
      const seriesId = trade.seriesId || trade.id;
      if (!acc[seriesId]) acc[seriesId] = [];
      acc[seriesId].push(trade);
      return acc;
    }, {} as Record<string, Trade[]>);
    
    // Flatten back to an array but keep the grouping
    return Object.values(grouped).flat();
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
                        if (trade.exitPremium !== undefined && trade.exitPremium !== null) {
                          return trade.exitPremium.toFixed(2);
                        }
                        // If trade is closed and has SPX close price, calculate exit premium on the fly
                        else if (trade.status === "CLOSED" && trade.spxClosePrice) {
                          const calculatedExitPrem = calculateExitPremium(trade);
                          return calculatedExitPrem !== undefined ? calculatedExitPrem.toFixed(2) : "0.00";
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
              <div key={`mobile-series-${item.seriesId}`} className="series-card">
                <div className="series-card-header">
                  <span className="series-title">
                    {item.trades.length > 1
                      ? `${item.trades.length} Trade Series`
                      : `1 Trade Series`}
                  </span>
                  {/* Ensure series-pnl-mobile is styled in CSS */}
                  <span className={`series-pnl-mobile ${item.pnl >= 0 ? "positive" : "negative"}`}>
                    {formatCurrency(item.pnl)}
                  </span>
                </div>
                {/* Optionally, you could list trade dates or levels within a series here */}
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
                    <span className="trade-card-date">{formatDate(trade.tradeDate)}</span>
                    <span className={`level-badge level-${trade.level.toLowerCase().replace(" ", "-")}`}>
                      {trade.level}
                    </span>
                  </div>
                  <span className="trade-card-type">
                    {trade.tradeType.replace("_", " ")}
                  </span>
                </div>

                <div className="trade-card-body">
                  <div className="trade-card-detail-group">
                    <span className="trade-card-label">Contracts:</span>
                    <span className="trade-card-value">{trade.contractQuantity}</span>
                  </div>

                  <div className="trade-card-detail-group">
                    <span className="trade-card-label">Entry Premium:</span>
                    <span className="trade-card-value">{trade.entryPremium.toFixed(2)}</span>
                  </div>

                  {trade.tradeType === "IRON_CONDOR" && (
                    <>
                      <div className="trade-card-detail-group">
                        <span className="trade-card-label">Sell Put:</span>
                        <span className="trade-card-value">{trade.strikes.sellPut}</span>
                      </div>
                      <div className="trade-card-detail-group">
                        <span className="trade-card-label">Sell Call:</span>
                        <span className="trade-card-value">{trade.strikes.sellCall}</span>
                      </div>
                      {trade.buyPut && (
                        <div className="trade-card-detail-group">
                          <span className="trade-card-label">Buy Put:</span>
                          <span className="trade-card-value">{trade.buyPut}</span>
                        </div>
                      )}
                      {trade.buyCall && (
                        <div className="trade-card-detail-group">
                          <span className="trade-card-label">Buy Call:</span>
                          <span className="trade-card-value">{trade.buyCall}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {trade.status === "CLOSED" && (
                    <div className="trade-card-detail-group">
                      <span className="trade-card-label">Exit Premium:</span>
                      <span className="trade-card-value">
                        {(() => {
                          if (trade.exitPremium !== undefined && trade.exitPremium !== null) {
                            return trade.exitPremium.toFixed(2);
                          }
                          if (trade.spxClosePrice) { // Calculate if SPX close is available
                            const calculatedExitPrem = calculateExitPremium(trade);
                            return calculatedExitPrem !== undefined ? calculatedExitPrem.toFixed(2) : "N/A";
                          }
                          return "N/A"; // Default if no exit premium and no SPX close
                        })()}
                      </span>
                    </div>
                  )}

                  {trade.spxClosePrice && (
                    <div className="trade-card-detail-group">
                      <span className="trade-card-label">SPX Close:</span>
                      <span className={`trade-card-value ${isBreach ? "breach" : ""}`}>
                        {trade.spxClosePrice}
                        {trade.isMaxProfit && <span className="check-mark">✓</span>}
                      </span>
                    </div>
                  )}
                  
                  {/* Status and P&L Section */} 
                  <div className="trade-card-status-pnl">
                    <div>
                      <span className="trade-card-label">Status:</span>
                      <span className={`status-badge ${trade.status.toLowerCase()} trade-card-value`}>
                        {trade.status}
                      </span>
                    </div>
                    <div>
                      <span className="trade-card-label">P&L:</span>
                      <span className={`trade-card-value ${trade.pnl && trade.pnl >= 0 ? "positive" : "negative"}`}>
                        {trade.pnl ? formatCurrency(trade.pnl) : "-"}
                      </span>
                    </div>
                  </div>

                  {/* Notes Section */} 
                  {trade.notes && (
                    <div className="trade-card-notes">
                      <span className="trade-card-label">Notes:</span>
                      <div className="trade-card-notes-content">
                        {trade.notes}
                      </div>
                    </div>
                  )}
                </div> {/* End trade-card-body */} 

                <div className="trade-card-footer">
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
        <>
          <TradeForm
            trade={currentTrade}
            onSave={handleUpdateTrade}
            onCancel={() => {
              setIsEditTradeModalOpen(false);
              setCurrentTrade(null);
            }}
            // isClosing prop removed as it's not for general editing
          />
          

        </>
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
