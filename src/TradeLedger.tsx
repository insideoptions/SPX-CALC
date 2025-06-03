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
  spxClosePrice?: number;
  isMaxProfit?: boolean;
  seriesId?: string;
}

const TradeLedger: React.FC = () => {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isAddTradeModalOpen, setIsAddTradeModalOpen] = useState(false);
  const [isEditTradeModalOpen, setIsEditTradeModalOpen] = useState(false);
  const [currentTrade, setCurrentTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch trades on mount or when user changes
  useEffect(() => {
    const loadTrades = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      const fetched = await fetchTrades(user.email);
      setTrades(fetched);
      setIsLoading(false);
    };
    loadTrades();
  }, [user]);

  // Handle delete
  const handleDelete = async (tradeId: string) => {
    if (!user?.email) return;
    if (!window.confirm("Delete this trade?")) return;
    setIsLoading(true);
    setError(null);
    const success = await deleteTrade(tradeId, user.email);
    if (success) setTrades(trades.filter((t) => t.id !== tradeId));
    else setError("Failed to delete trade. Please try again.");
    setIsLoading(false);
  };

  // Handle save (add)
  const handleSaveTrade = async (tradeData: Omit<Trade, "id">) => {
    if (!user?.email) return;
    setIsLoading(true);
    setError(null);
    try {
      const saved = await createTrade({ ...tradeData, userEmail: user.email });
      if (saved) {
        setTrades([...trades, saved]);
        setIsAddTradeModalOpen(false);
      } else {
        setError("Failed to save trade.");
      }
    } catch (err) {
      setError("Failed to save trade.");
    }
    setIsLoading(false);
  };

  // Handle update
  const handleUpdateTrade = async (trade: Trade) => {
    if (!user?.email) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateTrade(trade, user.email);
      if (updated) {
        setTrades(trades.map((t) => (t.id === updated.id ? updated : t)));
        setIsEditTradeModalOpen(false);
        setCurrentTrade(null);
      } else {
        setError("Failed to update trade.");
      }
    } catch (err) {
      setError("Failed to update trade.");
    }
    setIsLoading(false);
  };

  return (
    <div className="trade-ledger-page">
      <h1>Trade Ledger</h1>
      <button onClick={() => setIsAddTradeModalOpen(true)}>+ Add Trade</button>
      {error && <div className="error-message">{error}</div>}
      {isLoading && <div>Loading...</div>}
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
            <th>Status</th>
            <th>P&L</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>{trade.tradeDate}</td>
              <td>{trade.level}</td>
              <td>{trade.tradeType}</td>
              <td>{trade.contractQuantity}</td>
              <td>{trade.strikes.sellPut}</td>
              <td>{trade.strikes.sellCall}</td>
              <td>{trade.entryPremium}</td>
              <td>{trade.exitPremium ?? "-"}</td>
              <td>{trade.status}</td>
              <td>{trade.pnl ?? "-"}</td>
              <td>
                <button
                  onClick={() => {
                    setCurrentTrade(trade);
                    setIsEditTradeModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(trade.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add Trade Modal */}
      {isAddTradeModalOpen && (
        <TradeForm
          onSave={handleSaveTrade}
          onCancel={() => setIsAddTradeModalOpen(false)}
        />
      )}

      {/* Edit Trade Modal */}
      {isEditTradeModalOpen && currentTrade && (
        <TradeForm
          trade={currentTrade}
          onSave={handleUpdateTrade}
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
