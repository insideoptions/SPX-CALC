import React, { useState } from "react";
import { Trade } from "./TradeLedger";
import { useAuth } from "./GoogleAuthContext";
import "./TradeForm.css";

interface TradeFormProps {
  trade?: Trade | null;
  onSave: (trade: Omit<Trade, "id"> | Trade) => void;
  onCancel: () => void;
}

const TradeForm: React.FC<TradeFormProps> = ({ trade, onSave, onCancel }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<Trade, "id">>({
    userId: user?.id || "",
    userEmail: user?.email || "",
    tradeDate: trade?.tradeDate || new Date().toISOString().split("T")[0],
    entryDate: trade?.entryDate || new Date().toISOString(),
    exitDate: trade?.exitDate,
    level: trade?.level || "Level 2",
    contractQuantity: trade?.contractQuantity || 1,
    entryPremium: trade?.entryPremium || 0,
    exitPremium: trade?.exitPremium,
    tradeType: trade?.tradeType || "IRON_CONDOR",
    strikes: trade?.strikes || {
      sellPut: 0,
      buyPut: 0,
      sellCall: 0,
      buyCall: 0,
    },
    status: trade?.status || "OPEN",
    pnl: trade?.pnl,
    fees: trade?.fees || 6.56,
    notes: trade?.notes || "",
    isAutoPopulated: trade?.isAutoPopulated || false,
    matrix: trade?.matrix || "standard",
    buyingPower: trade?.buyingPower || "$26,350",
    spxClosePrice: trade?.spxClosePrice,
    isMaxProfit: trade?.isMaxProfit,
    seriesId: trade?.seriesId,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: typeof prev[name as keyof typeof prev] === "number" ? Number(value) : value,
    }));
  };

  const handleStrikesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      strikes: {
        ...prev.strikes,
        [name]: Number(value),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trade) {
      onSave({ ...trade, ...formData });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="trade-form-modal">
      <form onSubmit={handleSubmit}>
        <h2>{trade ? "Edit Trade" : "Add Trade"}</h2>
        <label>
          Trade Date:
          <input type="date" name="tradeDate" value={formData.tradeDate} onChange={handleChange} required />
        </label>
        <label>
          Level:
          <input type="text" name="level" value={formData.level} onChange={handleChange} required />
        </label>
        <label>
          Contract Quantity:
          <input type="number" name="contractQuantity" value={formData.contractQuantity} onChange={handleChange} required />
        </label>
        <label>
          Entry Premium:
          <input type="number" name="entryPremium" value={formData.entryPremium} onChange={handleChange} required />
        </label>
        <label>
          Exit Premium:
          <input type="number" name="exitPremium" value={formData.exitPremium || ""} onChange={handleChange} />
        </label>
        <label>
          Trade Type:
          <select name="tradeType" value={formData.tradeType} onChange={handleChange}>
            <option value="IRON_CONDOR">Iron Condor</option>
            <option value="PUT_SPREAD">Put Spread</option>
            <option value="CALL_SPREAD">Call Spread</option>
          </select>
        </label>
        <label>
          Sell Put:
          <input type="number" name="sellPut" value={formData.strikes.sellPut} onChange={handleStrikesChange} />
        </label>
        <label>
          Buy Put:
          <input type="number" name="buyPut" value={formData.strikes.buyPut} onChange={handleStrikesChange} />
        </label>
        <label>
          Sell Call:
          <input type="number" name="sellCall" value={formData.strikes.sellCall} onChange={handleStrikesChange} />
        </label>
        <label>
          Buy Call:
          <input type="number" name="buyCall" value={formData.strikes.buyCall} onChange={handleStrikesChange} />
        </label>
        <label>
          Status:
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </label>
        <label>
          P&L:
          <input type="number" name="pnl" value={formData.pnl || ""} onChange={handleChange} />
        </label>
        <label>
          Fees:
          <input type="number" name="fees" value={formData.fees} onChange={handleChange} />
        </label>
        <label>
          Notes:
          <input type="text" name="notes" value={formData.notes} onChange={handleChange} />
        </label>
        <button type="submit">{trade ? "Update" : "Add"} Trade</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
};

export default TradeForm;