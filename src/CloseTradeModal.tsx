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
      const spreadWidth = 5; // 5-point wide spreads

      // Use either the nested strikes object or top-level properties
      const buyPut = trade.buyPut || sellPut - 5;
      const buyCall = trade.buyCall || sellCall + 5;

      let pnl = 0;

      // Full win: SPX between the short strikes
      if (spx >= sellPut && spx <= sellCall) {
        // Full profit: premium collected minus fees
        pnl = premium * 100 * contracts - fees;
      }
      // Full loss: SPX at or beyond long strikes
      else if (spx <= buyPut || spx >= buyCall) {
        // Max loss: (spread width - premium collected) * contract size
        const maxLossPerContract = (spreadWidth - premium) * 100;
        pnl = -(maxLossPerContract * contracts) - fees;
      }
      // Partial loss on put side
      else if (spx < sellPut && spx > buyPut) {
        // Calculate how far into the spread we are
        const intrusion = sellPut - spx;
        const lossPercentage = intrusion / spreadWidth;
        // Partial loss: portion of max loss based on how far SPX breached the short strike
        const partialLossPerContract = lossPercentage * spreadWidth * 100;
        // P&L: premium collected - partial loss
        pnl =
          premium * 100 * contracts - partialLossPerContract * contracts - fees;
      }
      // Partial loss on call side
      else if (spx > sellCall && spx < buyCall) {
        // Calculate how far into the spread we are
        const intrusion = spx - sellCall;
        const lossPercentage = intrusion / spreadWidth;
        // Partial loss: portion of max loss based on how far SPX breached the short strike
        const partialLossPerContract = lossPercentage * spreadWidth * 100;
        // P&L: premium collected - partial loss
        pnl =
          premium * 100 * contracts - partialLossPerContract * contracts - fees;
      }

      setCalculatedPnl(parseFloat(pnl.toFixed(2)));
    } else {
      setCalculatedPnl(null);
    }
  }, [spxClosePrice, trade]);

  const handleSubmit = () => {
    if (spxClosePrice === "" || calculatedPnl === null) {
      alert("Please enter a valid SPX Close Price.");
      return;
    }

    // Calculate exit premium based on the outcome of the trade
    // For Iron Condors, handle full wins, full losses, and partial losses
    let exitPremium = 0;
    if (trade && trade.tradeType === "IRON_CONDOR") {
      const spx = Number(spxClosePrice);
      const sellPut = trade.strikes.sellPut;
      const sellCall = trade.strikes.sellCall;

      // Use either the nested strikes object or top-level properties
      // Standard 5-point wide spreads
      const buyPut = trade.buyPut || sellPut - 5;
      const buyCall = trade.buyCall || sellCall + 5;

      const spreadWidth = 5; // 5-point wide spreads

      // Full win: SPX between the short strikes
      if (spx >= sellPut && spx <= sellCall) {
        exitPremium = 0; // Full win
      }
      // Full loss: SPX at or beyond long strikes
      else if (spx <= buyPut || spx >= buyCall) {
        exitPremium = spreadWidth; // Full loss = width of spread
      }
      // Partial loss on put side
      else if (spx < sellPut && spx > buyPut) {
        // Calculate how far into the spread we are as a percentage
        const intrusion = sellPut - spx;
        const partialLoss = (intrusion / spreadWidth) * spreadWidth;
        exitPremium = parseFloat(partialLoss.toFixed(2)); // Round to 2 decimal places
      }
      // Partial loss on call side
      else if (spx > sellCall && spx < buyCall) {
        const intrusion = spx - sellCall;
        const partialLoss = (intrusion / spreadWidth) * spreadWidth;
        exitPremium = parseFloat(partialLoss.toFixed(2)); // Round to 2 decimal places
      }
    }

    // Debug and ensure proper exitPremium value
    console.log("CloseTradeModal final exitPremium:", exitPremium);

    const updatedTradeData: Partial<Trade> = {
      id: trade.id, // Important: ensure ID is passed for update
      spxClosePrice: Number(spxClosePrice),
      exitDate: exitDate,
      pnl: calculatedPnl,
      status: "CLOSED",
      exitPremium: exitPremium,
    };

    // Log the full trade payload for debugging
    console.log("CloseTradeModal sending trade update:", updatedTradeData);
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
