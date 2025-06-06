import React, { useState, useEffect } from "react";
import { Trade } from "./TradeLedger";
import { useAuth } from "./GoogleAuthContext";
import "./TradeForm.css";

interface TradeFormProps {
  trade?: Trade | null;
  onSave: (trade: Partial<Trade>) => void;
  onCancel: () => void;
}

const TradeForm: React.FC<TradeFormProps> = ({ trade, onSave, onCancel }) => {
  const { user } = useAuth();

  const [pnlForDisplay, setPnlForDisplay] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    tradeDate: string;
    level: string;
    contractQuantity: number;
    entryPremium: number;
    exitPremium: number;
    tradeType: "IRON_CONDOR";
    sellPut: number;
    buyPut: number;
    sellCall: number;
    buyCall: number;
    fees: number;
    notes: string;
    status?: string;
    spxClosePrice?: number;
    customSpxClosePrice?: string;
    customExitPremium?: string;
    useCustomExit?: boolean;
    matrix?: any;
    buyingPower?: number;
  }>({
    tradeDate: trade?.tradeDate || new Date().toISOString().split("T")[0],
    level: trade?.level || "Level 2",
    contractQuantity: trade?.contractQuantity || 1,
    entryPremium: trade?.entryPremium || 0,
    exitPremium: trade?.exitPremium || 0,
    // Always use IRON_CONDOR as trade type
    tradeType: "IRON_CONDOR" as const,
    sellPut: trade?.strikes?.sellPut || 0,
    sellCall: trade?.strikes?.sellCall || 0,
    fees: trade?.fees || 6.56,
    notes: trade?.notes || "",
    matrix: trade?.matrix || "standard",
    buyingPower: trade?.buyingPower || 26350,
    spxClosePrice: trade?.spxClosePrice || undefined,
    useCustomExit: false,
    customExitPremium: "",
  });

  // Calculate P&L based on form data
  const calculateTradePnl = (
    currentFormData: typeof formData
  ): number | null => {
    const {
      spxClosePrice: spxClosePriceInput,
      sellPut: sellPutInput,
      sellCall: sellCallInput,
      entryPremium: entryPremiumInput,
      contractQuantity: contractQuantityInput,
      fees: feesInput,
      exitPremium: exitPremiumInput,
    } = currentFormData;

    const spxClosePrice = parseFloat(String(spxClosePriceInput));
    const sellPut = parseFloat(String(sellPutInput));
    const sellCall = parseFloat(String(sellCallInput));
    const entryPremium = parseFloat(String(entryPremiumInput));
    const contractQuantity = parseInt(String(contractQuantityInput), 10);
    const fees = parseFloat(String(feesInput));
    const exitPremium = parseFloat(String(exitPremiumInput));

    const spreadWidth = 5; // Assuming 5-point wide spreads for Iron Condors

    if (!isNaN(spxClosePrice) && String(spxClosePriceInput).trim() !== "") {
      if (
        isNaN(sellPut) ||
        isNaN(sellCall) ||
        isNaN(entryPremium) ||
        isNaN(contractQuantity) ||
        isNaN(fees)
      )
        return null;

      const putLegLossPoints = Math.max(
        0,
        Math.min(sellPut - spxClosePrice, spreadWidth)
      );
      const callLegLossPoints = Math.max(
        0,
        Math.min(spxClosePrice - sellCall, spreadWidth)
      );
      const totalLossPoints = putLegLossPoints + callLegLossPoints;

      const grossPL = (entryPremium - totalLossPoints) * contractQuantity * 100;
      const netPL = grossPL - fees;
      return netPL;
    } else if (
      !isNaN(exitPremium) &&
      exitPremium > 0 &&
      (isNaN(spxClosePrice) || String(spxClosePriceInput).trim() === "")
    ) {
      // Legacy calculation if exitPremium is present and SPX close price is not being used
      if (isNaN(entryPremium) || isNaN(contractQuantity) || isNaN(fees))
        return null;
      const grossPL = (entryPremium - exitPremium) * contractQuantity * 100;
      const netPL = grossPL - fees;
      return netPL;
    }

    return null;
  };

  useEffect(() => {
    const pnl = calculateTradePnl(formData);
    setPnlForDisplay(pnl);
  }, [formData]);

  const handleInputChange = (field: string, value: any) => {
    console.log(`Updating field ${field} with value:`, value);

    if (
      field === "spxClosePrice" &&
      formData.tradeType === "IRON_CONDOR" &&
      value.trim() !== ""
    ) {
      const spxClose = parseFloat(value);
      const sellPut = parseFloat(String(formData.sellPut));
      const sellCall = parseFloat(String(formData.sellCall));

      if (!isNaN(spxClose) && !isNaN(sellPut) && !isNaN(sellCall)) {
        // For IC: If SPX is outside the short strikes, force the exit premium to 5.00 (max loss)
        // If SPX is inside short strikes, force exit premium to 0 (win)
        let autoExitPremium = 0;
        if (spxClose < sellPut || spxClose > sellCall) {
          autoExitPremium = 5.0;
        }

        // Only auto-set exit premium if custom exit is not used
        if (!formData.useCustomExit) {
          setFormData((prev) => ({
            ...prev,
            [field]: value,
            exitPremium: autoExitPremium,
            status: "CLOSED",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            [field]: value,
            status: "CLOSED",
          }));
        }
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    } else if (field === "useCustomExit") {
      // If toggling custom exit option
      if (value) {
        // When enabling custom exit, set the customExitPremium field to the current exitPremium
        const currentExitPremium = formData.exitPremium || "";
        setFormData((prev) => ({
          ...prev,
          useCustomExit: value,
          customExitPremium: String(currentExitPremium), // Ensure it's a string
        }));
      } else {
        // When disabling custom exit, revert to auto calculation if SPX is set
        const spxClose = parseFloat(String(formData.spxClosePrice));
        const sellPut = parseFloat(String(formData.sellPut));
        const sellCall = parseFloat(String(formData.sellCall));

        let autoExitPremium = 0;
        if (!isNaN(spxClose) && !isNaN(sellPut) && !isNaN(sellCall)) {
          if (spxClose < sellPut || spxClose > sellCall) {
            autoExitPremium = 5.0;
          }
        }

        setFormData((prev) => ({
          ...prev,
          useCustomExit: value,
          exitPremium: autoExitPremium,
        }));
      }
    } else if (field === "customExitPremium" && formData.useCustomExit) {
      // When changing custom exit premium, also update the actual exit premium
      const exitValue = value === "" ? 0 : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        customExitPremium: String(value), // Ensure it's a string
        exitPremium: isNaN(exitValue) ? prev.exitPremium : exitValue,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    // Calculate PNL every time form data changes
    const newFormData = { ...formData, [field]: value };
    if (field === "customExitPremium" && formData.useCustomExit) {
      const exitValue = value === "" ? 0 : parseFloat(value);
      if (!isNaN(exitValue)) {
        newFormData.exitPremium = exitValue;
      }
    }
    const calculatedPnl = calculateTradePnl(newFormData);
    setPnlForDisplay(calculatedPnl);
  };

  const handleSave = () => {
    console.log(
      "%c TRADEFORM - SAVE BUTTON CLICKED ",
      "background: red; color: white; font-size: 16px"
    );

    try {
      // Helper functions for safe number parsing
      const parseToNumber = (val: any, defaultVal: number = 0): number => {
        if (val === undefined || val === null || String(val).trim() === "")
          return defaultVal;
        const num = parseFloat(String(val));
        return isNaN(num) ? defaultVal : num;
      };

      const parseToInt = (val: any, defaultVal: number = 0): number => {
        if (val === undefined || val === null || String(val).trim() === "")
          return defaultVal;
        const num = parseInt(String(val), 10);
        return isNaN(num) ? defaultVal : num;
      };

      // Function to handle undefined or empty values
      const parseToNumberOrUndefined = (val: any): number | undefined => {
        if (val === undefined || val === null || String(val).trim() === "")
          return undefined;
        const num = parseFloat(String(val));
        return isNaN(num) ? undefined : num;
      };

      // Log all starting values for debugging
      console.log("Form data before processing:", formData);
      console.log("Original trade if editing:", trade);
      console.log("Level before save:", String(formData.level || "").trim());

      // STEP 1: Prepare core trade data with explicit type handling
      const tradeDataToSave: Partial<Trade> = {
        // Core identification fields - preserve ID if editing
        id: trade?.id,
        userId: user?.id || "",
        userEmail: user?.email || "",

        // Core trade fields - ensure proper string handling
        level: String(formData.level || "").trim() || "Level 2", // Default to Level 2 if empty
        tradeType: formData.tradeType || "IRON_CONDOR",
        matrix: formData.matrix || "STANDARD",
        buyingPower: String(formData.buyingPower || "").trim(),
        notes: formData.notes || "",

        // Core numeric fields - explicit number conversion
        contractQuantity: parseToInt(formData.contractQuantity, 1),
        entryPremium: parseToNumber(formData.entryPremium, 0),
        fees: parseToNumber(formData.fees, 0),

        // Date handling
        tradeDate: formData.tradeDate || new Date().toISOString().split("T")[0],
        entryDate: trade?.entryDate || new Date().toISOString(),

        // Preserve other important fields
        seriesId: trade?.seriesId,
        isAutoPopulated: trade?.isAutoPopulated,
      };

      // STEP 2: Handle strike fields properly
      // First, extract all strike values with defaults
      const sellPutValue = parseToNumber(formData.sellPut);
      const buyPutValue = parseToNumber(formData.buyPut);
      const sellCallValue = parseToNumber(formData.sellCall);
      const buyCallValue = parseToNumber(formData.buyCall);

      // Set nested strikes object
      tradeDataToSave.strikes = {
        sellPut: sellPutValue,
        buyPut: buyPutValue,
        sellCall: sellCallValue,
        buyCall: buyCallValue,
      };

      // Also set top-level strike fields for compatibility
      tradeDataToSave.sellPut = sellPutValue;
      tradeDataToSave.buyPut = buyPutValue;
      tradeDataToSave.sellCall = sellCallValue;
      tradeDataToSave.buyCall = buyCallValue;

      // STEP 3: Handle trade closure status and related fields
      let closedThisEdit = false;

      // Get current values for calculations
      const currentSpxClosePrice = parseToNumberOrUndefined(
        formData.spxClosePrice
      );
      const currentExitPremium = parseToNumberOrUndefined(formData.exitPremium);

      // Calculate final PNL for display
      const finalPnl = pnlForDisplay !== null ? pnlForDisplay : 0;

      // Handle trade status based on original status
      if (!trade || trade.status === "OPEN") {
        // Logic for open trades or new trades
        if (
          formData.tradeType === "IRON_CONDOR" &&
          currentSpxClosePrice !== undefined
        ) {
          // Close with SPX price for iron condor
          tradeDataToSave.status = "CLOSED";
          tradeDataToSave.spxClosePrice = currentSpxClosePrice;
          tradeDataToSave.exitPremium = undefined;
          tradeDataToSave.pnl = finalPnl;
          closedThisEdit = true;
        } else if (currentExitPremium !== undefined) {
          // Close with exit premium
          tradeDataToSave.status = "CLOSED";
          tradeDataToSave.exitPremium = currentExitPremium;
          tradeDataToSave.spxClosePrice = undefined;
          const ep = tradeDataToSave.entryPremium ?? 0;
          const cq = tradeDataToSave.contractQuantity ?? 0;
          const f = tradeDataToSave.fees ?? 0;
          tradeDataToSave.pnl = (ep - currentExitPremium) * cq * 100 - f;
          closedThisEdit = true;
        } else {
          // Keep as open trade
          tradeDataToSave.status = "OPEN";
          tradeDataToSave.pnl = undefined;
          tradeDataToSave.exitDate = undefined;
          tradeDataToSave.exitPremium = undefined;
          tradeDataToSave.spxClosePrice = undefined;
        }

        // Set exit date if the trade was closed in this edit
        if (closedThisEdit) {
          tradeDataToSave.exitDate = new Date().toISOString().split("T")[0];
        }
      } else if (trade.status === "CLOSED") {
        // Editing a CLOSED trade
        tradeDataToSave.status = "CLOSED";
        tradeDataToSave.exitDate =
          trade.exitDate || new Date().toISOString().split("T")[0];

        // Handle custom exit premium when editing closed trades
        if (formData.useCustomExit && formData.customExitPremium) {
          const customExit = parseFloat(String(formData.customExitPremium));
          if (!isNaN(customExit)) {
            tradeDataToSave.exitPremium = customExit;
            // Calculate PNL based on custom exit premium
            const ep = tradeDataToSave.entryPremium ?? 0;
            const cq = tradeDataToSave.contractQuantity ?? 0;
            const f = tradeDataToSave.fees ?? 0;
            tradeDataToSave.pnl = (ep - customExit) * cq * 100 - f;
          }
        }

        // Handle iron condor specific logic
        if (formData.tradeType === "IRON_CONDOR") {
          if (currentSpxClosePrice !== undefined) {
            tradeDataToSave.spxClosePrice = currentSpxClosePrice;
            tradeDataToSave.exitPremium = undefined;
            tradeDataToSave.pnl = finalPnl;
          } else if (
            trade.spxClosePrice !== undefined &&
            currentSpxClosePrice === undefined
          ) {
            alert(
              "SPX Close Price cannot be empty for a closed Iron Condor. Please provide a value or revert."
            );
            return;
          } else if (currentExitPremium !== undefined) {
            tradeDataToSave.exitPremium = currentExitPremium;
            tradeDataToSave.spxClosePrice = undefined;
            const ep = tradeDataToSave.entryPremium ?? 0;
            const cq = tradeDataToSave.contractQuantity ?? 0;
            const f = tradeDataToSave.fees ?? 0;
            tradeDataToSave.pnl = (ep - currentExitPremium) * cq * 100 - f;
          } else {
            tradeDataToSave.pnl = finalPnl;
          }
        } else {
          // Non-iron condor closed trades
          if (currentExitPremium !== undefined) {
            tradeDataToSave.exitPremium = currentExitPremium;
            tradeDataToSave.spxClosePrice = undefined;
            const ep = tradeDataToSave.entryPremium ?? 0;
            const cq = tradeDataToSave.contractQuantity ?? 0;
            const f = tradeDataToSave.fees ?? 0;
            tradeDataToSave.pnl = (ep - currentExitPremium) * cq * 100 - f;
          } else {
            tradeDataToSave.pnl = finalPnl;
          }
        }
      }

      // STEP 4: Calculate isMaxProfit for iron condors with SPX close price
      if (
        tradeDataToSave.tradeType === "IRON_CONDOR" &&
        typeof tradeDataToSave.spxClosePrice === "number" &&
        tradeDataToSave.spxClosePrice > 0 &&
        typeof tradeDataToSave.sellPut === "number" &&
        typeof tradeDataToSave.sellCall === "number"
      ) {
        // Within this block, tradeDataToSave.sellPut and .sellCall are known to be numbers
        tradeDataToSave.isMaxProfit =
          tradeDataToSave.spxClosePrice > tradeDataToSave.sellPut &&
          tradeDataToSave.spxClosePrice < tradeDataToSave.sellCall;
      } else {
        tradeDataToSave.isMaxProfit = false;
      }

      // Log the final prepared trade data
      console.log(
        "Trade data ready to save:",
        JSON.stringify(tradeDataToSave, null, 2)
      );
      console.log("Final level value being saved:", tradeDataToSave.level);

      // Send updated trade data to parent component
      onSave(tradeDataToSave);
    } catch (error) {
      console.error("Error in handleSave:", error);
      alert(
        `Error saving trade: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }; // End of handleSave function

  const isNewTrade = !trade;
  const isIronCondor = formData.tradeType === "IRON_CONDOR";
  const isEditingOpenTrade = !!(trade && trade.status === "OPEN");
  const isEditingClosedTrade = !!(trade && trade.status === "CLOSED");

  const wasClosedBySpx =
    isEditingClosedTrade && trade?.spxClosePrice !== undefined;
  // A trade was closed by exit premium if it's closed, has an exit premium, AND does not have an SPX close price (SPX takes precedence)
  const wasClosedByExitPremium =
    isEditingClosedTrade &&
    trade?.exitPremium !== undefined &&
    trade?.spxClosePrice === undefined;

  let showSpxInput = false;
  let showExitPremiumInput = false;
  let spxInputRequired = false;

  if (isNewTrade) {
    showSpxInput = true; // SPX input is always shown for new trades
    spxInputRequired = true; // SPX input is always required for new trades
    showExitPremiumInput = false; // Exit Premium is never shown for new trades
  } else if (isEditingOpenTrade) {
    showSpxInput = true; // Offer SPX to close any open trade
    showExitPremiumInput = true; // Offer Exit Premium to close any open trade
  } else if (isEditingClosedTrade) {
    if (isIronCondor) {
      // For a closed IC, it must have been closed by SPX (or is a legacy one we want to migrate)
      showSpxInput = true; // Allow editing SPX if IC
      // Show exit premium input only if it's a legacy closed IC (closed by exit premium) AND user hasn't started entering SPX close
      showExitPremiumInput =
        wasClosedByExitPremium &&
        String(formData.spxClosePrice ?? "").trim() === "";
    } else {
      // Non-IC closed trade (must have been by exit premium)
      showSpxInput = false; // Don't show SPX for already closed non-ICs
      showExitPremiumInput = true; // Allow editing exit premium for closed non-ICs
    }
  }

  // Allow editing all fields regardless of trade status to correct mistakes
  const disableCoreTradeDetails = false;
  // For closed trades, SPX input is disabled if it was closed by exit premium (and not an IC being migrated)
  // For closed trades, Exit Premium input is disabled if it was closed by SPX.
  // Allow editing all fields regardless of how the trade was closed
  const disableSpxInputForClosed = false;
  const disableExitPremiumInputForClosed = false;

  return (
    <div className="trade-form-overlay">
      <div className="trade-form-container">
        <div className="trade-form-header">
          <h3>{trade ? "Edit Trade" : "Add New Trade"}</h3>
          <button onClick={onCancel} className="cancel-button">
            &times;
          </button>
        </div>

        <div className="trade-form">
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
                  disabled={disableCoreTradeDetails}
                  required
                />
              </div>
              <div className="form-group">
                <label>Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => handleInputChange("level", e.target.value)}
                  disabled={disableCoreTradeDetails}
                >
                  <option value="Level 1">Level 1</option>
                  <option value="Level 2">Level 2</option>
                  <option value="Level 3">Level 3</option>
                  <option value="Level 4">Level 4</option>
                  <option value="Level 5">Level 5</option>
                </select>
              </div>
              <div className="form-group">
                <label>Trade Type</label>
                <input
                  type="text"
                  value="IRON CONDOR"
                  disabled={true}
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Contract Details Section */}
          <div className="form-section">
            <h4>Contract Details</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Contract Quantity</label>
                <input
                  type="number"
                  value={formData.contractQuantity}
                  onChange={(e) =>
                    handleInputChange("contractQuantity", e.target.value)
                  }
                  disabled={disableCoreTradeDetails}
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Entry Premium</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entryPremium}
                  onChange={(e) =>
                    handleInputChange("entryPremium", e.target.value)
                  }
                  disabled={disableCoreTradeDetails}
                  required
                />
              </div>

              {showSpxInput && (
                <div className="form-group">
                  <label>SPX Close Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.spxClosePrice ?? ""}
                    onChange={(e) =>
                      handleInputChange("spxClosePrice", e.target.value)
                    }
                    required={spxInputRequired}
                    disabled={disableSpxInputForClosed}
                  />
                </div>
              )}

              {/* Close Early / Partial W/L Section - Always show for editing */}
              {(isNewTrade || trade) && (
                <div className="form-section early-close-section">
                  <h4>Close Early / Partial W/L</h4>
                  <div className="form-group">
                    <div className="checkbox-container">
                      <input
                        type="checkbox"
                        id="useCustomExit"
                        checked={formData.useCustomExit}
                        onChange={(e) =>
                          handleInputChange("useCustomExit", e.target.checked)
                        }
                      />
                      <label htmlFor="useCustomExit">
                        Use custom exit premium
                      </label>
                    </div>
                    <div className="custom-exit-info">
                      Default: 0.00 for wins, 5.00 for losses
                    </div>
                  </div>

                  {formData.useCustomExit && (
                    <div className="form-group">
                      <label>Custom Exit Premium</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.customExitPremium}
                        onChange={(e) =>
                          handleInputChange("customExitPremium", e.target.value)
                        }
                        placeholder="Enter exit premium"
                      />
                      {formData.entryPremium > 0 &&
                        formData.customExitPremium && (
                          <div className="exit-premium-hint">
                            {parseFloat(String(formData.customExitPremium)) >
                            parseFloat(String(formData.entryPremium))
                              ? `Loss: $${(
                                  parseFloat(
                                    String(formData.customExitPremium)
                                  ) - parseFloat(String(formData.entryPremium))
                                ).toFixed(2)} per contract`
                              : `Saved: $${(
                                  5.0 -
                                  parseFloat(String(formData.customExitPremium))
                                ).toFixed(2)} per contract from max loss`}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Fees</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.fees}
                  onChange={(e) => handleInputChange("fees", e.target.value)}
                  disabled={disableCoreTradeDetails}
                />
              </div>

              {pnlForDisplay !== null && (
                <div className="form-group pnl-display">
                  <label>Calculated P&L</label>
                  <input
                    type="text"
                    value={`$${pnlForDisplay.toFixed(2)}`}
                    readOnly
                    className={
                      pnlForDisplay >= 0 ? "pnl-positive" : "pnl-negative"
                    }
                  />
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h4>Strikes (Iron Condor)</h4>
            <div className="form-grid strikes-grid">
              <div className="form-group">
                <label>Sell Put</label>
                <input
                  type="number"
                  value={formData.sellPut ?? ""}
                  onChange={(e) => handleInputChange("sellPut", e.target.value)}
                  disabled={disableCoreTradeDetails}
                  required
                />
                <div className="strike-info">
                  Buy Put:{" "}
                  {formData.sellPut ? Number(formData.sellPut) - 5 : "--"}
                </div>
              </div>
              <div className="form-group">
                <label>Sell Call</label>
                <input
                  type="number"
                  value={formData.sellCall ?? ""}
                  onChange={(e) =>
                    handleInputChange("sellCall", e.target.value)
                  }
                  disabled={disableCoreTradeDetails}
                  required
                />
                <div className="strike-info">
                  Buy Call:{" "}
                  {formData.sellCall ? Number(formData.sellCall) + 5 : "--"}
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Additional Information</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>Matrix</label>
                <select
                  value={formData.matrix}
                  onChange={(e) => handleInputChange("matrix", e.target.value)}
                  disabled={disableCoreTradeDetails && !isNewTrade}
                >
                  <option value="standard">Standard Matrix</option>
                  <option value="shifted">Shifted Matrix</option>
                  <option value="stacked">Stacked Matrix</option>
                </select>
              </div>
              <div className="form-group">
                <label>Buying Power</label>
                <input
                  type="text"
                  value={formData.buyingPower ?? ""}
                  onChange={(e) =>
                    handleInputChange("buyingPower", e.target.value)
                  }
                  disabled={disableCoreTradeDetails && !isNewTrade}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h4>Additional Notes</h4>
            <div className="form-group">
              <textarea
                value={formData.notes ?? ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              ></textarea>
            </div>
          </div>

          {pnlForDisplay !== null && (
            <div className="form-section mobile-pnl">
              <div className="pnl-display-mobile">
                <span className="pnl-label">Calculated P&L:</span>
                <span
                  className={
                    pnlForDisplay >= 0
                      ? "pnl-value positive"
                      : "pnl-value negative"
                  }
                >
                  ${pnlForDisplay.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeForm;
