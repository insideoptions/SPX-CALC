import React, { useState } from "react";
import { useAuth } from "./GoogleAuthContext";
import "./TradeForm.css";
import { Trade } from "./api";

interface TradeFormProps {
  onSubmit: (trade: Omit<Trade, "id">) => void;
  initialValues?: Trade;
  isEditing?: boolean;
  onCancel?: () => void;
}

const TradeForm: React.FC<TradeFormProps> = ({
  onSubmit,
  initialValues,
  isEditing = false,
  onCancel,
}) => {
  const { user } = useAuth();
  const [tradeDate, setTradeDate] = useState(
    initialValues?.tradeDate || new Date().toISOString().split("T")[0]
  );
  const [entryDate, setEntryDate] = useState(
    initialValues?.entryDate || new Date().toISOString().split("T")[0]
  );
  const [exitDate, setExitDate] = useState(initialValues?.exitDate || "");
  const [level, setLevel] = useState(initialValues?.level || "Level 1");
  const [contractQuantity, setContractQuantity] = useState(
    initialValues?.contractQuantity || 1
  );
  const [entryPremium, setEntryPremium] = useState(
    initialValues?.entryPremium || 0
  );
  const [exitPremium, setExitPremium] = useState(
    initialValues?.exitPremium || 0
  );
  const [tradeType, setTradeType] = useState<
    "IRON_CONDOR" | "PUT_SPREAD" | "CALL_SPREAD"
  >(initialValues?.tradeType || "IRON_CONDOR");
  const [sellPut, setSellPut] = useState(initialValues?.strikes.sellPut || 0);
  const [buyPut, setBuyPut] = useState(initialValues?.strikes.buyPut || 0);
  const [sellCall, setSellCall] = useState(
    initialValues?.strikes.sellCall || 0
  );
  const [buyCall, setBuyCall] = useState(initialValues?.strikes.buyCall || 0);
  const [status, setStatus] = useState<"OPEN" | "CLOSED" | "EXPIRED">(
    initialValues?.status || "OPEN"
  );
  const [fees, setFees] = useState(initialValues?.fees || 0);
  const [notes, setNotes] = useState(initialValues?.notes || "");
  const [matrix, setMatrix] = useState(initialValues?.matrix || "Standard");
  const [buyingPower, setBuyingPower] = useState(
    initialValues?.buyingPower || "0"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Log for debugging
    console.log("Form submitted with data:", {
      tradeDate,
      entryDate,
      exitDate,
      level,
      contractQuantity,
      entryPremium,
      exitPremium,
      tradeType,
      strikes: {
        sellPut,
        buyPut,
        sellCall,
        buyCall,
      },
      status,
      fees,
      notes,
      matrix,
      buyingPower,
    });

    const pnl =
      status !== "OPEN"
        ? (entryPremium - exitPremium) * contractQuantity * 100 - fees
        : undefined;

    const tradeData: Omit<Trade, "id"> = {
      userId: initialValues?.userId || user.id,
      userEmail: initialValues?.userEmail || user.email,
      tradeDate,
      entryDate,
      exitDate: exitDate || undefined,
      level,
      contractQuantity,
      entryPremium,
      exitPremium: exitPremium || undefined,
      tradeType,
      strikes: {
        sellPut,
        buyPut,
        sellCall,
        buyCall,
      },
      status,
      pnl,
      fees,
      notes,
      isAutoPopulated: initialValues?.isAutoPopulated || false,
      matrix,
      buyingPower,
    };

    // Call the onSubmit prop function passed from the parent
    onSubmit(tradeData);
  };

  return (
    <div className="trade-form-container">
      <h2>{isEditing ? "Edit Trade" : "Add New Trade"}</h2>
      <form onSubmit={handleSubmit} className="trade-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="tradeDate">Trade Date</label>
            <input
              type="date"
              id="tradeDate"
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="entryDate">Entry Date</label>
            <input
              type="date"
              id="entryDate"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="exitDate">Exit Date</label>
            <input
              type="date"
              id="exitDate"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="level">Level</label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              required
            >
              <option value="Level 1">Level 1</option>
              <option value="Level 2">Level 2</option>
              <option value="Level 3">Level 3</option>
              <option value="Level 4">Level 4</option>
              <option value="Level 5">Level 5</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="contractQuantity">Contract Quantity</label>
            <input
              type="number"
              id="contractQuantity"
              value={contractQuantity}
              onChange={(e) => setContractQuantity(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="entryPremium">Entry Premium</label>
            <input
              type="number"
              id="entryPremium"
              value={entryPremium}
              onChange={(e) => setEntryPremium(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="exitPremium">Exit Premium</label>
            <input
              type="number"
              id="exitPremium"
              value={exitPremium}
              onChange={(e) => setExitPremium(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tradeType">Trade Type</label>
            <select
              id="tradeType"
              value={tradeType}
              onChange={(e) =>
                setTradeType(
                  e.target.value as "IRON_CONDOR" | "PUT_SPREAD" | "CALL_SPREAD"
                )
              }
              required
            >
              <option value="IRON_CONDOR">Iron Condor</option>
              <option value="PUT_SPREAD">Put Spread</option>
              <option value="CALL_SPREAD">Call Spread</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="sellPut">Sell Put Strike</label>
            <input
              type="number"
              id="sellPut"
              value={sellPut}
              onChange={(e) => setSellPut(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="buyPut">Buy Put Strike</label>
            <input
              type="number"
              id="buyPut"
              value={buyPut}
              onChange={(e) => setBuyPut(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="sellCall">Sell Call Strike</label>
            <input
              type="number"
              id="sellCall"
              value={sellCall}
              onChange={(e) => setSellCall(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="buyCall">Buy Call Strike</label>
            <input
              type="number"
              id="buyCall"
              value={buyCall}
              onChange={(e) => setBuyCall(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "OPEN" | "CLOSED" | "EXPIRED")
              }
              required
            >
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fees">Fees</label>
            <input
              type="number"
              id="fees"
              value={fees}
              onChange={(e) => setFees(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="matrix">Matrix</label>
            <input
              type="text"
              id="matrix"
              value={matrix}
              onChange={(e) => setMatrix(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="buyingPower">Buying Power</label>
            <input
              type="text"
              id="buyingPower"
              value={buyingPower}
              onChange={(e) => setBuyingPower(e.target.value)}
              onFocus={(e) => e.target.select()}
              required
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="form-actions">
          {onCancel && (
            <button type="button" className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="submit-button">
            {isEditing ? "Update Trade" : "Add Trade"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
