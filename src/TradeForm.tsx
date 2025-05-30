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
  });

  // Calculate P&L in real-time
  const calculatePnL = () => {
    if (isClosing || (trade && formData.exitPremium > 0)) {
      const grossPnL =
        (formData.entryPremium - formData.exitPremium) *
        formData.contractQuantity *
        100;
      return grossPnL - formData.fees;
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    onSave(tradeData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
                  onChange={(e) =>
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
                  onChange={(e) => handleInputChange("level", e.target.value)}
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
                  onChange={(e) => handleInputChange("matrix", e.target.value)}
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
                  onChange={(e) =>
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
                  onChange={(e) =>
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
                  onChange={(e) =>
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
                  onChange={(e) =>
                    handleInputChange(
                      "entryPremium",
                      parseFloat(e.target.value)
                    )
                  }
                  step="0.01"
                  min="0"
                  required
                  disabled={isClosing}
                />
              </div>

              {(isClosing || trade?.status === "CLOSED") && (
                <div className="form-group">
                  <label>Exit Premium ($)</label>
                  <input
                    type="number"
                    value={formData.exitPremium}
                    onChange={(e) =>
                      handleInputChange(
                        "exitPremium",
                        parseFloat(e.target.value)
                      )
                    }
                    step="0.01"
                    min="0"
                    required={isClosing}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Total Fees ($)</label>
                <input
                  type="number"
                  value={formData.fees}
                  onChange={(e) =>
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
                      <label>Sell Put Strike</label>
                      <input
                        type="number"
                        value={formData.sellPut}
                        onChange={(e) =>
                          handleInputChange("sellPut", parseInt(e.target.value))
                        }
                        step="5"
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label>Buy Put Strike</label>
                      <input
                        type="number"
                        value={formData.buyPut}
                        onChange={(e) =>
                          handleInputChange("buyPut", parseInt(e.target.value))
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
                        onChange={(e) =>
                          handleInputChange(
                            "sellCall",
                            parseInt(e.target.value)
                          )
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
                        onChange={(e) =>
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
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
                placeholder="Add any notes about this trade..."
                className="form-textarea"
              />
            </div>
          </div>

          {/* P&L Preview */}
          {(isClosing || formData.exitPremium > 0) && (
            <div className="pnl-preview">
              <h4>P&L Preview</h4>
              <div className="pnl-details">
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
            <button type="submit" className="save-button">
              {isClosing ? "Close Trade" : trade ? "Update Trade" : "Add Trade"}
            </button>
          </div>
        </form>
    </div>
  );
};

export default TradeForm;
