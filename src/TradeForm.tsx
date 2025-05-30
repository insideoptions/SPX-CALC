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
    tradeDate: trade?.tradeDate || new Date().toISOString().split("T")[0],
    level: trade?.level || "Level 2",
    contractQuantity: trade?.contractQuantity || 1,
    entryPremium: trade?.entryPremium || 0,
    exitPremium: trade?.exitPremium || 0,
    tradeType: trade?.tradeType || ("IRON_CONDOR" as const),
    sellPut: trade?.strikes?.sellPut || 0,
    buyPut: trade?.strikes?.buyPut || 0,
    sellCall: trade?.strikes?.sellCall || 0,
    buyCall: trade?.strikes?.buyCall || 0,
    fees: trade?.fees || 6.56,
    notes: trade?.notes || "",
    matrix: trade?.matrix || "standard",
    buyingPower: trade?.buyingPower || "$26,350",
    spxClosePrice: trade?.spxClosePrice || 0,
  });

  // Calculate P&L in real-time
  const calculatePnL = () => {
    // If not closing or no exit premium, return 0
    if (
      !isClosing &&
      !(trade && formData.exitPremium > 0) &&
      !formData.spxClosePrice
    ) {
      return 0;
    }

    // For iron condors with SPX close price
    if (formData.tradeType === "IRON_CONDOR" && formData.spxClosePrice > 0) {
      // Check if SPX closed between the sell sides (max profit)
      const isMaxProfit =
        formData.spxClosePrice > formData.sellPut &&
        formData.spxClosePrice < formData.sellCall;

      if (isMaxProfit) {
        // Max profit: keep all premium
        const maxProfit =
          formData.entryPremium * formData.contractQuantity * 100 -
          formData.fees;
        return maxProfit;
      } else {
        // Loss: 5-wide spread minus premium received
        // Standard iron condor spread width is 5 points ($500 per contract)
        const loss =
          (formData.entryPremium - 5.0) * formData.contractQuantity * 100 -
          formData.fees;
        return loss; // This will be negative
      }
    }

    // Standard calculation for other cases
    const grossPnL =
      (formData.entryPremium - formData.exitPremium) *
      formData.contractQuantity *
      100;
    return grossPnL - formData.fees;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");

    // Check if SPX closed between sell sides for iron condors
    const isMaxProfit =
      formData.tradeType === "IRON_CONDOR" &&
      formData.spxClosePrice > 0 &&
      formData.spxClosePrice > formData.sellPut &&
      formData.spxClosePrice < formData.sellCall;

    // For iron condors with SPX close price, automatically set exit premium
    // If it's a win (SPX between sell strikes), exit premium is 0 (kept all premium)
    // If it's a loss (SPX outside sell strikes), exit premium is max loss (5.00)
    let exitPremium = formData.exitPremium;
    if (formData.tradeType === "IRON_CONDOR" && formData.spxClosePrice > 0) {
      exitPremium = isMaxProfit ? 0 : 5.0;
    }

    // Determine if the trade should be closed
    const shouldClose =
      isClosing ||
      formData.exitPremium > 0 ||
      (formData.tradeType === "IRON_CONDOR" && formData.spxClosePrice > 0);

    const tradeData: Partial<Trade> = {
      ...trade,
      userId: user?.id || "",
      userEmail: user?.email || "",
      tradeDate: formData.tradeDate,
      entryDate: trade?.entryDate || new Date().toISOString(),
      level: formData.level,
      contractQuantity: formData.contractQuantity,
      entryPremium: formData.entryPremium,
      exitPremium: shouldClose ? exitPremium : undefined,
      tradeType: formData.tradeType,
      strikes: {
        sellPut: formData.sellPut,
        buyPut: formData.buyPut,
        sellCall: formData.sellCall,
        buyCall: formData.buyCall,
      },
      status: shouldClose ? "CLOSED" : "OPEN",
      pnl: calculatePnL(),
      fees: formData.fees,
      notes: formData.notes,
      isAutoPopulated: false,
      matrix: formData.matrix,
      buyingPower: formData.buyingPower,
      spxClosePrice:
        formData.spxClosePrice > 0 ? formData.spxClosePrice : undefined,
      isMaxProfit: isMaxProfit,
    };

    if (isClosing) {
      tradeData.exitDate = new Date().toISOString();
    }

    // Call the onSave function with the trade data
    console.log("Saving trade data:", tradeData);
    onSave(tradeData);
  };

  const handleInputChange = (field: string, value: any) => {
    console.log(`Updating field ${field} with value:`, value);

    // If updating SPX close price for an iron condor, automatically update other fields
    if (
      field === "spxClosePrice" &&
      value > 0 &&
      formData.tradeType === "IRON_CONDOR"
    ) {
      const isMaxProfit = value > formData.sellPut && value < formData.sellCall;

      // For iron condors with SPX close price, automatically set exit premium
      // If it's a win (SPX between sell strikes), exit premium is 0 (kept all premium)
      // If it's a loss (SPX outside sell strikes), exit premium is max loss (5.00)
      const exitPremium = isMaxProfit ? 0 : 5.0;

      setFormData((prev: typeof formData) => ({
        ...prev,
        [field]: value,
        exitPremium: exitPremium,
        // Automatically set status to CLOSED when SPX close price is entered
        status: "CLOSED",
      }));
    } else {
      setFormData((prev: typeof formData) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="trade-form-container">
      <div className="trade-form-header">
        <h3>
          {isClosing ? "Close Trade" : trade ? "Edit Trade" : "Add New Trade"}
        </h3>
        <button className="close-button" onClick={onCancel}>
          ×
        </button>
      </div>

      <form onSubmit={handleSubmit} className="trade-form">
        {/* Basic Info Section */}
        <div className="form-section">
          <h4>Basic Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Trade Date</label>
              <input
                type="date"
                value={formData.tradeDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("tradeDate", e.target.value)
                }
                required
                disabled={isClosing}
              />
            </div>

            <div className="form-group">
              <label>Level</label>
              <select
                value={formData.level}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleInputChange("level", e.target.value)
                }
                disabled={isClosing}
              >
                <option value="Level 2">Level 2</option>
                <option value="Level 3">Level 3</option>
                <option value="Level 4">Level 4</option>
                <option value="Level 5">Level 5</option>
                <option value="Level 6">Level 6</option>
                <option value="Level 7">Level 7</option>
              </select>
            </div>

            <div className="form-group">
              <label>Matrix Type</label>
              <select
                value={formData.matrix}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleInputChange("matrix", e.target.value)
                }
                disabled={isClosing}
              >
                <option value="standard">Standard Matrix</option>
                <option value="stacked">Stacked Matrix</option>
                <option value="shifted">Shifted Matrix</option>
              </select>
            </div>

            <div className="form-group">
              <label>Buying Power</label>
              <select
                value={formData.buyingPower}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleInputChange("buyingPower", e.target.value)
                }
                disabled={isClosing}
              >
                <option value="$11,800">$11,800</option>
                <option value="$16,300">$16,300</option>
                <option value="$21,900">$21,900</option>
                <option value="$26,350">$26,350</option>
                <option value="$30,850">$30,850</option>
                <option value="$33,300">$33,300</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trade Details Section */}
        <div className="form-section">
          <h4>Trade Details</h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Trade Type</label>
              <select
                value={formData.tradeType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  handleInputChange("tradeType", e.target.value)
                }
                disabled={isClosing}
              >
                <option value="IRON_CONDOR">Iron Condor</option>
                <option value="PUT_SPREAD">Put Spread</option>
                <option value="CALL_SPREAD">Call Spread</option>
              </select>
            </div>

            <div className="form-group">
              <label>Contracts</label>
              <input
                type="number"
                value={formData.contractQuantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange(
                    "contractQuantity",
                    parseInt(e.target.value)
                  )
                }
                min="1"
                required
                disabled={isClosing}
              />
            </div>

            <div className="form-group">
              <label>Entry Premium ($)</label>
              <input
                type="number"
                value={formData.entryPremium}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("entryPremium", parseFloat(e.target.value))
                }
                step="0.01"
                min="0"
                required
                disabled={isClosing}
              />
            </div>

            {(isClosing || trade?.status === "CLOSED") && (
              <>
                <div className="form-group">
                  <label>Exit Premium ($)</label>
                  <input
                    type="number"
                    value={formData.exitPremium}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange(
                        "exitPremium",
                        parseFloat(e.target.value)
                      )
                    }
                    step="0.01"
                    min="0"
                    required={isClosing && formData.tradeType !== "IRON_CONDOR"}
                  />
                </div>

                {formData.tradeType === "IRON_CONDOR" && (
                  <div className="form-group">
                    <label>SPX Close Price</label>
                    <input
                      type="number"
                      value={formData.spxClosePrice || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(
                          "spxClosePrice",
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      step="0.01"
                      min="0"
                      placeholder="Enter SPX closing price"
                      required={
                        isClosing && formData.tradeType === "IRON_CONDOR"
                      }
                    />
                    <small className="form-helper-text">
                      If SPX closes between {formData.sellPut} and{" "}
                      {formData.sellCall}, this trade is a 100% winner.
                    </small>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Total Fees ($)</label>
              <input
                type="number"
                value={formData.fees}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("fees", parseFloat(e.target.value))
                }
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        {/* Strike Prices Section */}
        {!isClosing && (
          <div className="form-section">
            <h4>Strike Prices</h4>
            <div className="form-grid">
              {formData.tradeType !== "CALL_SPREAD" && (
                <>
                  <div className="form-group">
                    <label>Buy Put Strike</label>
                    <input
                      type="number"
                      value={formData.buyPut}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("buyPut", parseInt(e.target.value))
                      }
                      step="5"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Sell Put Strike</label>
                    <input
                      type="number"
                      value={formData.sellPut}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("sellPut", parseInt(e.target.value))
                      }
                      step="5"
                      min="0"
                    />
                  </div>
                </>
              )}

              {formData.tradeType !== "PUT_SPREAD" && (
                <>
                  <div className="form-group">
                    <label>Sell Call Strike</label>
                    <input
                      type="number"
                      value={formData.sellCall}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("sellCall", parseInt(e.target.value))
                      }
                      step="5"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Buy Call Strike</label>
                    <input
                      type="number"
                      value={formData.buyCall}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleInputChange("buyCall", parseInt(e.target.value))
                      }
                      step="5"
                      min="0"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="form-section">
          <h4>Additional Notes</h4>
          <div className="form-group">
            <textarea
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange("notes", e.target.value)
              }
              rows={3}
              placeholder="Add any notes about this trade..."
              className="form-textarea"
            />
          </div>
        </div>

        {/* P&L Preview */}
        {(isClosing ||
          formData.exitPremium > 0 ||
          (formData.tradeType === "IRON_CONDOR" &&
            formData.spxClosePrice > 0)) && (
          <div className="pnl-preview">
            <h4>P&L Preview</h4>
            <div className="pnl-details">
              {formData.tradeType === "IRON_CONDOR" &&
              formData.spxClosePrice > 0 ? (
                // Iron Condor with SPX close price
                <>
                  <div className="pnl-row">
                    <span>SPX Close Price:</span>
                    <span>{formData.spxClosePrice}</span>
                  </div>
                  <div className="pnl-row">
                    <span>Sell Put Strike:</span>
                    <span>{formData.sellPut}</span>
                  </div>
                  <div className="pnl-row">
                    <span>Sell Call Strike:</span>
                    <span>{formData.sellCall}</span>
                  </div>
                  <div className="pnl-row">
                    <span>Result:</span>
                    <span>
                      {formData.spxClosePrice > formData.sellPut &&
                      formData.spxClosePrice < formData.sellCall
                        ? "MAX PROFIT (SPX between sell strikes)"
                        : "MAX LOSS (SPX outside sell strikes)"}
                    </span>
                  </div>
                  <div className="pnl-row">
                    <span>Entry Premium:</span>
                    <span>
                      $
                      {(
                        formData.entryPremium *
                        formData.contractQuantity *
                        100
                      ).toFixed(2)}
                    </span>
                  </div>
                  {!(
                    formData.spxClosePrice > formData.sellPut &&
                    formData.spxClosePrice < formData.sellCall
                  ) && (
                    <div className="pnl-row">
                      <span>Max Loss (5-wide spread):</span>
                      <span>
                        -${(5.0 * formData.contractQuantity * 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pnl-row">
                    <span>Total Fees:</span>
                    <span>-${formData.fees.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                // Standard P&L calculation
                <>
                  <div className="pnl-row">
                    <span>Gross P&L:</span>
                    <span>
                      $
                      {(
                        (formData.entryPremium - formData.exitPremium) *
                        formData.contractQuantity *
                        100
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="pnl-row">
                    <span>Total Fees:</span>
                    <span>-${formData.fees.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="pnl-row total">
                <span>Net P&L:</span>
                <span className={calculatePnL() >= 0 ? "profit" : "loss"}>
                  ${calculatePnL().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="save-button"
            onClick={() => {
              console.log("Save button clicked directly");

              // Create the trade data directly without form submission
              const tradeData: Partial<Trade> = {
                ...trade,
                userId: user?.id || "",
                userEmail: user?.email || "",
                tradeDate: formData.tradeDate,
                entryDate: trade?.entryDate || new Date().toISOString(),
                level: formData.level,
                contractQuantity: formData.contractQuantity,
                entryPremium: formData.entryPremium,
                exitPremium: formData.exitPremium || undefined,
                tradeType: formData.tradeType,
                strikes: {
                  sellPut: formData.sellPut,
                  buyPut: formData.buyPut,
                  sellCall: formData.sellCall,
                  buyCall: formData.buyCall,
                },
                status: isClosing
                  ? "CLOSED"
                  : formData.exitPremium > 0
                  ? "CLOSED"
                  : "OPEN",
                pnl: calculatePnL(),
                fees: formData.fees,
                notes: formData.notes,
                isAutoPopulated: false,
                matrix: formData.matrix,
                buyingPower: formData.buyingPower,
              };

              if (isClosing) {
                tradeData.exitDate = new Date().toISOString();
              }

              // Call onSave directly
              console.log("Directly calling onSave with:", tradeData);
              onSave(tradeData);
            }}
          >
            {isClosing ? "Close Trade" : trade ? "Update Trade" : "Add Trade"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradeForm;
