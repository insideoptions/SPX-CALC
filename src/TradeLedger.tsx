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

  // Mock data for demonstration
  useEffect(() => {
    // Mock trades data
    const mockTrades: Trade[] = [
      {
        id: "1",
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate: "2025-05-14",
        entryDate: "2025-05-14",
        level: "Level 2",
        contractQuantity: 1,
        entryPremium: 1.85,
        exitPremium: 5.00,
        tradeType: "IRON_CONDOR",
        strikes: {
          sellPut: 5505,
          buyPut: 5500,
          sellCall: 5655,
          buyCall: 5660
        },
        status: "CLOSED",
        pnl: -321.56,
        fees: 6.56,
        isAutoPopulated: false,
        matrix: "standard",
        buyingPower: "$26,350",
        spxClosePrice: 5400,
        seriesId: "series_1"
      },
      {
        id: "2",
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate: "2025-05-15",
        entryDate: "2025-05-15",
        level: "Level 3",
        contractQuantity: 5,
        entryPremium: 1.95,
        exitPremium: 0.00,
        tradeType: "IRON_CONDOR",
        strikes: {
          sellPut: 5775,
          buyPut: 5770,
          sellCall: 5855,
          buyCall: 5860
        },
        status: "CLOSED",
        pnl: 968.44,
        fees: 32.80,
        isAutoPopulated: false,
        matrix: "standard",
        buyingPower: "$26,350",
        spxClosePrice: 5825,
        isMaxProfit: true,
        seriesId: "series_1"
      },
      {
        id: "3",
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate: "2025-05-21",
        entryDate: "2025-05-21",
        level: "Level 2",
        contractQuantity: 1,
        entryPremium: 1.85,
        exitPremium: 0.00,
        tradeType: "IRON_CONDOR",
        strikes: {
          sellPut: 5885,
          buyPut: 5880,
          sellCall: 6000,
          buyCall: 6005
        },
        status: "CLOSED",
        pnl: 178.44,
        fees: 6.56,
        isAutoPopulated: false,
        matrix: "standard",
        buyingPower: "$26,350",
        spxClosePrice: 5905,
        isMaxProfit: true
      },
      {
        id: "4",
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate: "2025-05-28",
        entryDate: "2025-05-28",
        level: "Level 2",
        contractQuantity: 1,
        entryPremium: 2.00,
        exitPremium: 0.00,
        tradeType: "IRON_CONDOR",
        strikes: {
          sellPut: 5885,
          buyPut: 5880,
          sellCall: 5955,
          buyCall: 5960
        },
        status: "CLOSED",
        pnl: 193.44,
        fees: 6.56,
        isAutoPopulated: false,
        matrix: "standard",
        buyingPower: "$26,350",
        spxClosePrice: 5889,
        isMaxProfit: true
      },
      {
        id: "5",
        userId: user?.id || "",
        userEmail: user?.email || "",
        tradeDate: "2025-05-30",
        entryDate: "2025-05-30",
        level: "Level 2",
        contractQuantity: 1,
        entryPremium: 1.95,
        exitPremium: 5.00,
        tradeType: "IRON_CONDOR",
        strikes: {
          sellPut: 5885,
          buyPut: 5880,
          sellCall: 5955,
          buyCall: 5960
        },
        status: "CLOSED",
        pnl: -314.56,
        fees: 6.56,
        isAutoPopulated: false,
        matrix: "standard",
        buyingPower: "$26,350",
        spxClosePrice: 5960
      }
    ];

    setTrades(mockTrades);
    setIsLoading(false);
  }, [user]);

  // Calculate statistics
  const calculateStats = () => {
    const totalTrades = trades.length;
    let totalPnl = 0;
    let winningTrades = 0;
    
    trades.forEach(trade => {
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
      winningTrades
    };
  };

  // Apply filters and sorting
  const getFilteredAndSortedTrades = () => {
    let filtered = [...trades];
    
    // Apply filter
    if (filterType !== "All Trades") {
      filtered = filtered.filter(trade => trade.status === filterType);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "Date":
          comparison = new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime();
          break;
        case "Level":
          comparison = parseInt(a.level.replace("Level ", "")) - parseInt(b.level.replace("Level ", ""));
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
      return filteredTrades.map(trade => ({ type: 'trade' as const, trade }));
    }
    
    const seriesMap = new Map<string, Trade[]>();
    const singleTrades: Trade[] = [];
    
    filteredTrades.forEach(trade => {
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
      const seriesPnl = seriesTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      displayItems.push({ 
        type: 'series', 
        seriesId, 
        trades: seriesTrades,
        pnl: seriesPnl
      });
      
      seriesTrades.forEach(trade => {
        displayItems.push({ type: 'trade', trade });
      });
    });
    
    // Add single trades
    singleTrades.forEach(trade => {
      displayItems.push({ 
        type: 'series', 
        seriesId: `single_${trade.id}`, 
        trades: [trade],
        pnl: trade.pnl || 0
      });
      displayItems.push({ type: 'trade', trade });
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
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const stats = calculateStats();
  const groupedTrades = getGroupedTrades();

  return (
    <div className="trade-ledger-page">
      {/* Header */}
      <div className="trade-ledger-header">
        <h1>Trade Ledger</h1>
        <button 
          className="add-trade-btn primary"
          onClick={() => setIsAddTradeModalOpen(true)}
        >
          + Add Trade
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total P&L</div>
          <div className={`stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
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
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="Date">Date</option>
            <option value="Level">Level</option>
            <option value="P&L">P&L</option>
          </select>
          <button 
            className="sort-direction"
            onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
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

        <div className="sync-info">
          Last synced: {formatTime(lastSyncTime)}
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
              if (item.type === 'series') {
                return (
                  <tr key={`series-${item.seriesId}`} className="series-row">
                    <td colSpan={10}>
                      {item.trades.length > 1 
                        ? `${item.trades.length} Trade Series` 
                        : `1 Trade Series`}
                    </td>
                    <td className={`series-pnl ${item.pnl >= 0 ? 'positive' : 'negative'}`}>
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
                      <span className={`level-badge level-${trade.level.toLowerCase().replace(' ', '-')}`}>
                        {trade.level}
                      </span>
                    </td>
                    <td>{trade.tradeType.replace('_', ' ')}</td>
                    <td>{trade.contractQuantity}</td>
                    <td>{trade.strikes.sellPut}</td>
                    <td>{trade.strikes.sellCall}</td>
                    <td>{trade.entryPremium.toFixed(2)}</td>
                    <td>{trade.exitPremium?.toFixed(2) || '0.00'}</td>
                    <td className={`spx-close ${
                      trade.spxClosePrice && (
                        trade.spxClosePrice > trade.strikes.sellCall ? 'breach' :
                        trade.spxClosePrice < trade.strikes.sellPut ? 'breach' : ''
                      )
                    }`}>
                      {trade.spxClosePrice || '-'}
                      {trade.isMaxProfit && <span className="check-mark">✓</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${trade.status.toLowerCase()}`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className={`pnl ${trade.pnl && trade.pnl >= 0 ? 'positive' : 'negative'}`}>
                      {trade.pnl ? formatCurrency(trade.pnl) : '-'}
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
                        onClick={() => {
                          if (window.confirm('Delete this trade?')) {
                            // Delete logic here
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

      {/* Modals */}
      {isAddTradeModalOpen && (
        <TradeForm 
          onSave={(tradeData) => {
            // Add trade logic
            setIsAddTradeModalOpen(false);
          }}
          onCancel={() => setIsAddTradeModalOpen(false)}
        />
      )}

      {isEditTradeModalOpen && currentTrade && (
        <TradeForm 
          trade={currentTrade}
          onSave={(tradeData) => {
            // Update trade logic
            setIsEditTradeModalOpen(false);
            setCurrentTrade(null);
          }}
          onCancel={() => {
            setIsEditTradeModalOpen(false);
            setCurrentTrade(null);
          }}
        />
      )}
    </div>
  );
};

export default TradeLedger;