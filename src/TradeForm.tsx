import React, { useState, useEffect } from "react";
import { Trade } from "./TradeLedger";
import { useAuth } from "./GoogleAuthContext";
import "./TradeForm.css";

interface TradeFormProps {
  trade?: Trade | null;
  onSave: (trade: Partial<Trade>) => void;
  onCancel: () => void;
  isClosing?: boolean;
}

const TradeForm: React.FC<TradeFormProps> = ({
  trade,
  onSave,
  onCancel,
  isClosing = false,
}) => {
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    tradeDate: new Date().toISOString().split("T")[0],
    level: "Level 3",
    matrix: "Standard Matrix",
    buyingPower: "$26,350",
    tradeType: "IRON_CONDOR",
    contractQuantity: 1,
    entryPremium: 0,
    exitPremium: 0,
    fees: 0,
    sellPut: 0,
    buyPut: 0,
    sellCall: 0,
    buyCall: 0,
    notes: "",
    spxClosePrice: 0,
  });

  // Initialize form data from trade if provided
  useEffect(() => {
    if (trade) {
      setFormData({
        tradeDate: trade.tradeDate || new Date().toISOString().split("T")[0],
        level: trade.level || "Level 3",
        matrix: trade.matrix || "Standard Matrix",
        buyingPower: trade.buyingPower || "$26,350",
        tradeType: trade.tradeType || "IRON_CONDOR",
        contractQuantity: trade.contractQuantity || 1,
        entryPremium: trade.entryPremium || 0,
        exitPremium: trade.exitPremium || 0,
        fees: trade.fees || 0,
        sellPut: trade.strikes?.sellPut || 0,
        buyPut: trade.strikes?.buyPut || 0,
        sellCall: trade.strikes?.sellCall || 0,
        buyCall: trade.strikes?.buyCall || 0,
        notes: trade.notes || "",
        spxClosePrice: trade.spxClosePrice || 0,
      });
    }
  }, [trade]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.tradeDate || !formData.level || formData.entryPremium <= 0) {
      alert("Please fill in all required fields");
      return;
    }

    // Calculate P&L if closing trade
    let pnl = 0;
    if (isClosing || formData.exitPremium > 0 || formData.spxClosePrice > 0) {
      const contractMultiplier = 100; // Each contract is worth $100 per point
      const entryTotal =
        formData.entryPremium * formData.contractQuantity * contractMultiplier;
      const fees = formData.fees || 0;

      // For iron condors with SPX close price
      if (formData.tradeType === "IRON_CONDOR" && formData.spxClosePrice > 0) {
        // Check if SPX closed between sell strikes (max profit)
        const isMaxProfit =
          formData.spxClosePrice > formData.sellPut &&
          formData.spxClosePrice < formData.sellCall;

        if (isMaxProfit) {
          // Max profit: keep all premium
          pnl = entryTotal - fees;
        } else {
          // Max loss: width of spread minus premium received
          const maxLoss =
            (5 - formData.entryPremium) *
            formData.contractQuantity *
            contractMultiplier;
          pnl = -maxLoss - fees;
        }
      }
      // For trades with explicit exit premium
      else if (formData.exitPremium > 0) {
        const exitTotal =
          formData.exitPremium * formData.contractQuantity * contractMultiplier;
        pnl = entryTotal - exitTotal - fees;
      }
    }

    // Determine if the trade should be closed
    const shouldClose =
      isClosing ||
      formData.exitPremium > 0 ||
      (formData.tradeType === "IRON_CONDOR" && formData.spxClosePrice > 0);

    // Create trade object
    const tradeData: Partial<Trade> = {
      ...trade,
      userId: user?.id || "",
      userEmail: user?.email || "",
      tradeDate: formData.tradeDate,
      entryDate: trade?.entryDate || new Date().toISOString(),
      level: formData.level,
      contractQuantity: formData.contractQuantity,
      entryPremium: formData.entryPremium,
      exitPremium: shouldClose ? formData.exitPremium : undefined,
      tradeType: formData.tradeType as
        | "IRON_CONDOR"
        | "PUT_SPREAD"
        | "CALL_SPREAD",
      strikes: {
        sellPut: formData.sellPut,
        buyPut: formData.buyPut,
        sellCall: formData.sellCall,
        buyCall: formData.buyCall,
      },
      status: shouldClose ? "CLOSED" : "OPEN",
      pnl: shouldClose ? pnl : undefined,
      fees: formData.fees,
      notes: formData.notes,
      isAutoPopulated: false,
      matrix: formData.matrix,
      buyingPower: formData.buyingPower,
      spxClosePrice:
        formData.spxClosePrice > 0 ? formData.spxClosePrice : undefined,
    };

    if (shouldClose) {
      tradeData.exitDate = new Date().toISOString();
    }

    // Call the onSave function with the trade data
    onSave(tradeData);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  return (
    <div className="trade-form">
      <h2>{isClosing ? "Close Trade" : trade ? "Edit Trade" : "Add Trade"}</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tradeDate">Trade Date</label>
              <input
                type="date"
                id="tradeDate"
                value={formData.tradeDate}
                onChange={(e) => handleInputChange("tradeDate", e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={formData.level}
                onChange={(e) => handleInputChange("level", e.target.value)}
                required
              >
                <option value="Level 1">Level 1</option>
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="matrix">Matrix Type</label>
              <select
                id="matrix"
                value={formData.matrix}
                onChange={(e) => handleInputChange("matrix", e.target.value)}
              >
                <option value="Standard Matrix">Standard Matrix</option>
                <option value="Custom Matrix">Custom Matrix</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="buyingPower">Buying Power</label>
              <select
                id="buyingPower"
                value={formData.buyingPower}
                onChange={(e) =>
                  handleInputChange("buyingPower", e.target.value)
                }
              >
                <option value="$26,350">$26,350</option>
                <option value="$52,700">$52,700</option>
                <option value="$105,400">$105,400</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Trade Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tradeType">Trade Type</label>
              <select
                id="tradeType"
                value={formData.tradeType}
                onChange={(e) => handleInputChange("tradeType", e.target.value)}
                required
              >
                <option value="IRON_CONDOR">Iron Condor</option>
                <option value="PUT_SPREAD">Put Spread</option>
                <option value="CALL_SPREAD">Call Spread</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contractQuantity">Contracts</label>
              <input
                type="number"
                id="contractQuantity"
                value={formData.contractQuantity}
                onChange={(e) =>
                  handleInputChange(
                    "contractQuantity",
                    parseInt(e.target.value)
                  )
                }
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="entryPremium">Entry Premium ($)</label>
              <input
                type="number"
                id="entryPremium"
                value={formData.entryPremium}
                onChange={(e) =>
                  handleInputChange("entryPremium", parseFloat(e.target.value))
                }
                step="0.01"
                min="0"
                required
              />
            </div>

            {(isClosing || trade?.status === "CLOSED") && (
              <div className="form-group">
                <label htmlFor="exitPremium">Exit Premium ($)</label>
                <input
                  type="number"
                  id="exitPremium"
                  value={formData.exitPremium}
                  onChange={(e) =>
                    handleInputChange("exitPremium", parseFloat(e.target.value))
                  }
                  step="0.01"
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fees">Total Fees ($)</label>
              <input
                type="number"
                id="fees"
                value={formData.fees}
                onChange={(e) =>
                  handleInputChange("fees", parseFloat(e.target.value))
                }
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Strike Prices</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="buyPut">Buy Put Strike</label>
              <input
                type="number"
                id="buyPut"
                value={formData.buyPut}
                onChange={(e) =>
                  handleInputChange("buyPut", parseInt(e.target.value))
                }
                required={
                  formData.tradeType === "IRON_CONDOR" ||
                  formData.tradeType === "PUT_SPREAD"
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="sellPut">Sell Put Strike</label>
              <input
                type="number"
                id="sellPut"
                value={formData.sellPut}
                onChange={(e) =>
                  handleInputChange("sellPut", parseInt(e.target.value))
                }
                required={
                  formData.tradeType === "IRON_CONDOR" ||
                  formData.tradeType === "PUT_SPREAD"
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="sellCall">Sell Call Strike</label>
              <input
                type="number"
                id="sellCall"
                value={formData.sellCall}
                onChange={(e) =>
                  handleInputChange("sellCall", parseInt(e.target.value))
                }
                required={
                  formData.tradeType === "IRON_CONDOR" ||
                  formData.tradeType === "CALL_SPREAD"
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="buyCall">Buy Call Strike</label>
              <input
                type="number"
                id="buyCall"
                value={formData.buyCall}
                onChange={(e) =>
                  handleInputChange("buyCall", parseInt(e.target.value))
                }
                required={
                  formData.tradeType === "IRON_CONDOR" ||
                  formData.tradeType === "CALL_SPREAD"
                }
              />
            </div>
          </div>
        </div>

        {isClosing && (
          <div className="form-section">
            <h3>Close Trade Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="spxClosePrice">SPX Close Price</label>
                <input
                  type="number"
                  id="spxClosePrice"
                  value={formData.spxClosePrice}
                  onChange={(e) =>
                    handleInputChange(
                      "spxClosePrice",
                      parseFloat(e.target.value)
                    )
                  }
                  step="0.01"
                />
                <small className="form-text">
                  Enter the SPX close price to automatically calculate P&L for
                  Iron Condors
                </small>
              </div>
            </div>
          </div>
        )}

        <div className="form-section">
          <h3>Additional Notes</h3>
          <div className="form-row">
            <div className="form-group full-width">
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Add any notes about this trade..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isClosing ? "Close Trade" : trade ? "Update Trade" : "Add Trade"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
