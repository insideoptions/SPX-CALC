import React, { useState, useEffect } from "react";
import { Trade } from "./api"; // Assuming Trade interface is in api.ts
import "./CloseTradeModal.css"; // We'll create this CSS file later

interface CloseTradeModalProps {
  trade: Trade;
  onClose: () => void;
  onSave: (updatedTrade: Partial<Trade>) => void;
}

const CloseTradeModal: React.FC<CloseTradeModalProps> = ({
  trade,
  onClose,
  onSave,
}) => {
  const [spxClosePrice, setSpxClosePrice] = useState<number | "">("");
  const [exitDate, setExitDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [calculatedPnl, setCalculatedPnl] = useState<number | null>(null);

  useEffect(() => {
    // Calculate P&L whenever spxClosePrice changes and is valid
    if (spxClosePrice !== "" && trade && trade.tradeType === "IRON_CONDOR") {
      const spx = Number(spxClosePrice);
      const sellPut = trade.strikes.sellPut;
      const sellCall = trade.strikes.sellCall;
      const premium = trade.entryPremium;
      const contracts = trade.contractQuantity;
      const fees = trade.fees;
      const spreadWidth = 5; // Assuming 5-point wide spreads as per requirement

      let pnl = 0;
      const isWin = spx > sellPut && spx < sellCall;

      if (isWin) {
        pnl = premium * 100 * contracts - fees;
      } else {
        // Max loss for an iron condor is spread width - premium collected
        const maxLossPerContract = (spreadWidth - premium) * 100;
        pnl = -(maxLossPerContract * contracts) - fees;
      }
      setCalculatedPnl(pnl);
    } else {
      setCalculatedPnl(null);
    }
  }, [spxClosePrice, trade]);

  const handleSubmit = () => {
    if (spxClosePrice === "" || calculatedPnl === null) {
      alert("Please enter a valid SPX Close Price.");
      return;
    }

    const updatedTradeData: Partial<Trade> = {
      id: trade.id, // Important: ensure ID is passed for update
      spxClosePrice: Number(spxClosePrice),
      exitDate: exitDate,
      pnl: calculatedPnl,
      status: "CLOSED",
      // Potentially set exitPremium to 0 or some other convention for closed trades
      // exitPremium: 0,
    };
    onSave(updatedTradeData);
  };

  if (!trade) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content close-trade-modal">
        <h2>Close Trade</h2>
        <p>
          <strong>Date:</strong>{" "}
          {new Date(trade.tradeDate).toLocaleDateString()}
        </p>
        <p>
          <strong>Level:</strong> {trade.level}
        </p>
        <p>
          <strong>Type:</strong> {trade.tradeType?.replace("_", " ")}
        </p>
        <p>
          <strong>Strikes:</strong> Sell Put: {trade.strikes.sellPut}, Sell
          Call: {trade.strikes.sellCall}
        </p>
        <p>
          <strong>Entry Premium:</strong> {trade.entryPremium.toFixed(2)}
        </p>

        <div className="form-group">
          <label htmlFor="exitDate">Exit Date:</label>
          <input
            type="date"
            id="exitDate"
            value={exitDate}
            onChange={(e) => setExitDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="spxClosePrice">SPX Close Price:</label>
          <input
            type="number"
            id="spxClosePrice"
            value={spxClosePrice}
            onChange={(e) =>
              setSpxClosePrice(
                e.target.value === "" ? "" : parseFloat(e.target.value)
              )
            }
            placeholder="Enter SPX close price"
          />
        </div>

        {calculatedPnl !== null && (
          <div className="pnl-preview">
            <strong>
              Calculated P&L:{" "}
              <span className={calculatedPnl >= 0 ? "positive" : "negative"}>
                {calculatedPnl.toFixed(2)}
              </span>
            </strong>
          </div>
        )}

        <div className="modal-actions">
          <button onClick={handleSubmit} className="btn-primary">
            Confirm Close
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseTradeModal;
