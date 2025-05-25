// SECTION 1: IMPORTS AND INTERFACES
import React, { useState, useEffect } from "react";
import "./IronCondorCalculator.css";

// Interfaces
interface LevelData {
  [key: string]: number;
}

interface MatrixTypeData {
  [key: string]: LevelData;
}

interface MatrixDataType {
  standard: MatrixTypeData;
  stacked: MatrixTypeData;
  shifted: MatrixTypeData;
}

interface CustomQuantitiesType {
  [key: string]: string | number;
}

interface PremiumLevelsType {
  [key: string]: number | string;
}

interface LevelOptimizationType {
  [key: string]: {
    closedEarly: boolean;
    closingPremium: number | string;
  };
}

interface MatrixResult {
  level: string;
  baseContracts: number;
  adjustedContracts: number;
  insufficientBP: boolean;
  premiumCollected: number;
  grossProfit: number;
  estimatedFees: number;
  netProfit: number;
  levelExitProfit: number;
  maxLossThisLevel: number;
  remainingCapital: number;
  maxContractsByBP: number;
  hasCustomQuantity: boolean;
  cumulativeMaxLosses: number;
  closedEarly: boolean;
  closingPremium: number;
  closingFees: number;
  actualProfitLoss: number;
}

interface IndividualTradeResults {
  grossPL: number;
  optimizationFees: number;
  totalFees: number;
  netPL: number;
}

interface NumericInputProps {
  value: number | string;
  onChange: (value: number | string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  isCustomQuantity?: boolean;
  disabled?: boolean;
}

// SECTION 2: NUMERIC INPUT COMPONENT
const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = "1",
  isCustomQuantity = false,
  disabled = false,
}) => {
  const [localInputValue, setLocalInputValue] = useState<string>(
    value === "" ? "" : String(value)
  );
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalInputValue(value === "" ? "" : String(value));
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsEditing(true);
    setLocalInputValue(newValue);

    if (newValue === "") {
      onChange("");
    } else if (!isNaN(Number(newValue))) {
      onChange(Number(newValue));
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localInputValue === "" && !isCustomQuantity) {
      // Keep empty for premium values
    } else if (localInputValue !== "") {
      const num = Number(localInputValue);
      if (!isNaN(num)) {
        setLocalInputValue(String(num));
      }
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  return (
    <input
      type="text"
      value={localInputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      step={step}
      min={min !== undefined ? min : undefined}
      max={max !== undefined ? max : undefined}
      inputMode="decimal"
      className="numeric-input"
      disabled={disabled}
    />
  );
};

// SECTION 3: MAIN COMPONENT AND MATRIX DATA
const IronCondorCalculator: React.FC = () => {
  // State for Matrix Calculator
  const [defaultPremium, setDefaultPremium] = useState<number>(1.75);
  const [feesPerIC, setFeesPerIC] = useState<number>(6.56);
  const [selectedMatrix, setSelectedMatrix] =
    useState<string>("$26,350 Matrix");
  const [matrixType, setMatrixType] = useState<string>("STANDARD MATRIX");
  const [activeTab, setActiveTab] = useState<string>("matrix");

  // Custom quantities, premiums, and optimizations
  const [customQuantities, setCustomQuantities] =
    useState<CustomQuantitiesType>({
      "Level 2": "",
      "Level 3": "",
      "Level 4": "",
      "Level 5": "",
      "Level 6": "",
      "Level 7": "",
    });

  const [premiumLevels, setPremiumLevels] = useState<PremiumLevelsType>({
    "Level 2": 1.75,
    "Level 3": 1.75,
    "Level 4": 1.75,
    "Level 5": 1.75,
    "Level 6": 1.75,
    "Level 7": 1.75,
  });

  const [levelOptimizations, setLevelOptimizations] =
    useState<LevelOptimizationType>({
      "Level 2": { closedEarly: false, closingPremium: "" },
      "Level 3": { closedEarly: false, closingPremium: "" },
      "Level 4": { closedEarly: false, closingPremium: "" },
      "Level 5": { closedEarly: false, closingPremium: "" },
      "Level 6": { closedEarly: false, closingPremium: "" },
      "Level 7": { closedEarly: false, closingPremium: "" },
    });

  // States for Individual Trade Calculator
  const [numContracts, setNumContracts] = useState<number>(1);
  const [sellPut, setSellPut] = useState<number>(4400);
  const [sellCall, setSellCall] = useState<number>(4480);
  const [premiumToOpen, setPremiumToOpen] = useState<number>(2.0);
  const [spxClosingPrice, setSpxClosingPrice] = useState<number>(4411.55);
  const [openingFees, setOpeningFees] = useState<number>(5.0);
  const [optimizationType, setOptimizationType] =
    useState<string>("No Optimization");
  const [premiumToClose, setPremiumToClose] = useState<number>(0);

  // Fixed spread width - only trading 5-wide spreads for now
  const spreadWidth = 5;

  // Matrix Data
  const matrixData: MatrixDataType = {
    // Standard Matrix Data
    standard: {
      "$11,800 Matrix": {
        "Level 2": 0,
        "Level 3": 2,
        "Level 4": 8,
        "Level 5": 24,
      },
      "$16,300 Matrix": {
        "Level 2": 0,
        "Level 3": 3,
        "Level 4": 11,
        "Level 5": 33,
      },
      "$21,900 Matrix": {
        "Level 2": 1,
        "Level 3": 4,
        "Level 4": 14,
        "Level 5": 44,
      },
      "$26,350 Matrix": {
        "Level 2": 1,
        "Level 3": 5,
        "Level 4": 17,
        "Level 5": 53,
      },
      "$30,850 Matrix": {
        "Level 2": 1,
        "Level 3": 6,
        "Level 4": 20,
        "Level 5": 62,
      },
      "$33,300 Matrix": {
        "Level 2": 2,
        "Level 3": 6,
        "Level 4": 21,
        "Level 5": 67,
      },
    },
    // Stacked Matrix Data
    stacked: {
      "$11,800 Matrix": {
        "Level 2": 0,
        "Level 3": 2,
        "Level 4": 8,
        "Level 5": 24,
      },
      "$16,300 Matrix": {
        "Level 2": 0,
        "Level 3": 3,
        "Level 4": 11,
        "Level 5": 33,
      },
      "$21,900 Matrix": {
        "Level 2": 0,
        "Level 3": 5,
        "Level 4": 14,
        "Level 5": 44,
      },
      "$26,350 Matrix": {
        "Level 2": 0,
        "Level 3": 6,
        "Level 4": 17,
        "Level 5": 53,
      },
      "$30,850 Matrix": {
        "Level 2": 0,
        "Level 3": 7,
        "Level 4": 20,
        "Level 5": 62,
      },
      "$33,300 Matrix": {
        "Level 2": 0,
        "Level 3": 8,
        "Level 4": 21,
        "Level 5": 67,
      },
    },
    // Shifted Matrix Data
    shifted: {
      "$11,800 Matrix": {
        "Level 3": 0,
        "Level 4": 2,
        "Level 5": 8,
        "Level 6": 24,
        "Level 7": 0,
      },
      "$16,300 Matrix": {
        "Level 3": 0,
        "Level 4": 3,
        "Level 5": 11,
        "Level 6": 33,
        "Level 7": 0,
      },
      "$21,900 Matrix": {
        "Level 3": 1,
        "Level 4": 4,
        "Level 5": 14,
        "Level 6": 44,
        "Level 7": 0,
      },
      "$26,350 Matrix": {
        "Level 3": 1,
        "Level 4": 5,
        "Level 5": 17,
        "Level 6": 53,
        "Level 7": 0,
      },
      "$30,850 Matrix": {
        "Level 3": 1,
        "Level 4": 6,
        "Level 5": 20,
        "Level 6": 62,
        "Level 7": 0,
      },
      "$33,300 Matrix": {
        "Level 3": 2,
        "Level 4": 6,
        "Level 5": 21,
        "Level 6": 67,
        "Level 7": 0,
      },
    },
  };

  // SECTION 4: HELPER FUNCTIONS
  // Get trading capital from the selected matrix
  const getTradingCapital = (): number => {
    const matrixName = selectedMatrix;
    const capitalMatch = matrixName.match(/\$([0-9,]+)/);
    if (capitalMatch && capitalMatch[1]) {
      return Number(capitalMatch[1].replace(/,/g, ""));
    }
    return 26350; // Default value if parsing fails
  };

  // Get the appropriate matrix data based on type
  const getMatrixData = (): LevelData => {
    const matrixTypeKey =
      matrixType === "STANDARD MATRIX"
        ? "standard"
        : matrixType === "STACKED MATRIX"
        ? "stacked"
        : "shifted";

    // Type assertion to help TypeScript understand the structure
    const selectedMatrixData =
      matrixData[matrixTypeKey as keyof MatrixDataType]?.[selectedMatrix] || {};

    return selectedMatrixData;
  };

  // Function to ensure level is profitable with given premium
  const ensureLevelProfitability = (
    contractCount: number,
    premiumForLevel: number,
    fees: number,
    cumulativeMaxLosses: number,
    isLastLevel: boolean
  ): number => {
    // Calculate profit per contract
    const profitPerContract = premiumForLevel * 100 - fees;

    if (profitPerContract <= 0) {
      // If premium is too low to be profitable per contract, we can't fix it
      return contractCount;
    }

    if (isLastLevel) {
      // For the last level, ensure that we at least break even overall
      const minContractsNeeded = Math.ceil(
        cumulativeMaxLosses / profitPerContract
      );
      return Math.max(contractCount, minContractsNeeded);
    }

    return contractCount;
  };

  // SECTION 5: MATRIX CALCULATION FUNCTION
  // Calculate the matrix results with early closure handling and proper risk assessment
  const calculateMatrixResults = (): MatrixResult[] => {
    const currentMatrixData = getMatrixData();
    const results: MatrixResult[] = [];

    // Get trading capital from the selected matrix
    const tradingCapital = getTradingCapital();

    // Check if any custom premiums are being used
    const hasCustomPremiums = Object.values(premiumLevels).some(
      (premium) => premium !== defaultPremium && premium !== ""
    );

    // Apply 2% buffer only when using custom premiums
    const bufferPercentage = 0.02; // 2% buffer
    const bufferAmount = hasCustomPremiums
      ? tradingCapital * bufferPercentage
      : 0;
    const usableBuyingPower = tradingCapital - bufferAmount;

    let remainingCapital = usableBuyingPower;

    // Sort levels to ensure they're in order
    const orderedLevels = Object.keys(currentMatrixData).sort();

    // Identify the last level for special handling
    const lastLevel = orderedLevels[orderedLevels.length - 1];

    // Track cumulative maximum losses for level exit profit calculations
    let cumulativeMaxLosses = 0;

    // Process each level
    for (const level of orderedLevels) {
      // Check if this is the last level
      const isLastLevel = level === lastLevel;

      // Check if a custom quantity exists for this level
      const hasCustomQuantity =
        customQuantities[level] !== "" &&
        !isNaN(Number(customQuantities[level]));

      // Base contract count - use custom quantity if provided, otherwise use matrix value
      const baseContractCount = hasCustomQuantity
        ? Number(customQuantities[level])
        : currentMatrixData[level];

      // Premium for this level - improved to handle empty string values
      const premiumForLevel =
        premiumLevels[level] === "" || premiumLevels[level] === undefined
          ? defaultPremium
          : Number(premiumLevels[level]);

      // Calculate adjusted contract count based on premium differences
      let adjustedContractCount = baseContractCount;

      if (!hasCustomQuantity && baseContractCount > 0 && premiumForLevel > 0) {
        // Reference premium is 1.75
        const referencePremium = 1.75;

        // Calculate premium adjustment ratio
        // Lower premium means we need more contracts to achieve same reward
        const premiumRatio = referencePremium / premiumForLevel;
        adjustedContractCount = Math.round(baseContractCount * premiumRatio);

        // Additional adjustment for max loss
        const baseMaxLoss = spreadWidth * 100 - referencePremium * 100;
        const actualMaxLoss = spreadWidth * 100 - premiumForLevel * 100;
        const maxLossRatio = actualMaxLoss / baseMaxLoss;

        adjustedContractCount = Math.round(
          adjustedContractCount / maxLossRatio
        );

        // If this is the last level and we have custom premiums, ensure profitability
        if (isLastLevel && hasCustomPremiums) {
          adjustedContractCount = ensureLevelProfitability(
            adjustedContractCount,
            premiumForLevel,
            feesPerIC,
            cumulativeMaxLosses,
            true
          );
        }
      }

      // Calculate max loss per contract + fees
      const maxLossPerContract = spreadWidth * 100 - premiumForLevel * 100;
      const totalCostPerContract = maxLossPerContract + feesPerIC;

      // Calculate max contracts based on remaining capital
      const maxContractsByBP = Math.floor(
        remainingCapital / totalCostPerContract
      );

      // Set a warning flag if max contracts by BP is less than base contracts
      const insufficientBP =
        maxContractsByBP <
        (hasCustomQuantity ? baseContractCount : adjustedContractCount);

      // Final contract count - respect buying power limits
      let finalContractCount = hasCustomQuantity
        ? Math.min(baseContractCount, maxContractsByBP)
        : Math.min(adjustedContractCount, maxContractsByBP);

      // For the last level with custom premiums, ensure we're maximizing profitability
      if (isLastLevel && hasCustomPremiums && !hasCustomQuantity) {
        // If remaining capital allows, use more contracts to maximize profit
        // But ensure we're still profitable overall
        finalContractCount = ensureLevelProfitability(
          maxContractsByBP,
          premiumForLevel,
          feesPerIC,
          cumulativeMaxLosses,
          true
        );
      }

      // Calculate standard P&L for this level (assuming no early closure)
      const grossProfit = finalContractCount * premiumForLevel * 100;
      const estimatedFees = finalContractCount * feesPerIC;
      const netProfit = grossProfit - estimatedFees;

      // Check if this level is marked as closed early
      const isClosedEarly = levelOptimizations[level]?.closedEarly || false;

      // Get closing premium (if applicable)
      const closingPremiumValue =
        levelOptimizations[level]?.closingPremium === "" ||
        levelOptimizations[level]?.closingPremium === undefined
          ? 0
          : Number(levelOptimizations[level].closingPremium);

      // Calculate early closure impact
      let actualProfitLoss = netProfit; // Default to regular net profit
      let closingFees = 0;
      let potentialLossThisLevel = 0;

      if (isClosedEarly) {
        // Calculate actual P&L for early closure
        const earlyClosureGrossProfit =
          (premiumForLevel - closingPremiumValue) * finalContractCount * 100;

        // Fee for closing early (same as opening fee by default)
        closingFees = finalContractCount * feesPerIC;

        // Actual P&L after accounting for early closure
        actualProfitLoss =
          earlyClosureGrossProfit - estimatedFees - closingFees;

        // For closed positions, potential loss is only if we actually had a loss
        potentialLossThisLevel =
          actualProfitLoss < 0 ? Math.abs(actualProfitLoss) : 0;
      } else {
        // For open positions, calculate the potential full loss
        potentialLossThisLevel =
          finalContractCount * maxLossPerContract + estimatedFees;
      }

      // Max Risk shows cumulative risk including previous level losses
      const maxLossThisLevel = potentialLossThisLevel + cumulativeMaxLosses;

      // Calculate Level Exit Profit/Loss
      let levelExitProfit = 0;

      if (isClosedEarly) {
        // For early closures, the level exit P&L is the actual P&L minus previous losses
        levelExitProfit = actualProfitLoss - cumulativeMaxLosses;
      } else {
        // For open positions, it's the potential win minus previous losses
        levelExitProfit = netProfit - cumulativeMaxLosses;
      }

      // Update running values for next level calculations
      if (isClosedEarly) {
        // If the level was closed early, update running P&L
        if (actualProfitLoss < 0) {
          // For a loss, add to the cumulative max losses
          cumulativeMaxLosses += Math.abs(actualProfitLoss);
          // For a loss, we've used capital equal to the loss amount
          remainingCapital -= Math.abs(actualProfitLoss);
        } else {
          // For a profit, add back to the remaining capital
          remainingCapital += actualProfitLoss;
          // No impact on cumulativeMaxLosses for profits
        }
      } else {
        // If not closed early, reserve capital for the potential loss
        remainingCapital -= potentialLossThisLevel;
        // Add this level's potential loss to cumulative max losses
        cumulativeMaxLosses += potentialLossThisLevel;
      }

      // Add result to the array
      results.push({
        level,
        baseContracts: baseContractCount,
        adjustedContracts: finalContractCount,
        insufficientBP,
        premiumCollected: premiumForLevel,
        grossProfit,
        estimatedFees,
        netProfit,
        levelExitProfit,
        maxLossThisLevel,
        remainingCapital,
        maxContractsByBP,
        hasCustomQuantity,
        cumulativeMaxLosses,
        closedEarly: isClosedEarly,
        closingPremium: closingPremiumValue,
        closingFees,
        actualProfitLoss,
      });
    }

    return results;
  };

  // SECTION 6: INDIVIDUAL TRADE CALCULATION
  // Calculate Individual Trade P&L
  const calculateIndividualTradePL = (): IndividualTradeResults => {
    let grossPL = 0;
    let optimizationFees = 0;

    // Calculate Gross P&L
    if (optimizationType !== "No Optimization" && premiumToClose > 0) {
      // For optimized trades, P&L is the difference between opening and closing premiums
      grossPL = (premiumToOpen - premiumToClose) * numContracts * 100;
    } else {
      // For trades allowed to expire
      // Check if SPX price is within the short strikes + spread width
      if (spxClosingPrice >= sellPut - 5 && spxClosingPrice <= sellCall + 5) {
        // Calculate based on how far SPX is from the short strikes
        const putSideLoss = Math.max(0, Math.min(sellPut - spxClosingPrice, 5));
        const callSideLoss = Math.max(
          0,
          Math.min(spxClosingPrice - sellCall, 5)
        );
        grossPL =
          (premiumToOpen - (putSideLoss + callSideLoss)) * numContracts * 100;
      } else {
        // Max loss scenario
        grossPL = (premiumToOpen - 5) * numContracts * 100;
      }
    }

    // Calculate Optimization Fees
    if (optimizationType === "PUT ONLY" || optimizationType === "CALL ONLY") {
      optimizationFees = 0.5 * openingFees;
    } else if (optimizationType === "FULL IC") {
      optimizationFees = openingFees;
    }

    const totalFees = (openingFees + optimizationFees) * numContracts;
    const netPL = grossPL - totalFees;

    return { grossPL, optimizationFees, totalFees, netPL };
  };

  // Calculate results
  const matrixResults = calculateMatrixResults();
  const individualTradeResults = calculateIndividualTradePL();

  // SECTION 7: MATRIX CALCULATOR UI
  const renderMatrixCalculator = () => {
    // Check if any custom premiums are being used
    const hasCustomPremiums = Object.values(premiumLevels).some(
      (premium) => premium !== defaultPremium && premium !== ""
    );

    return (
      <div className="card">
        <h2>Matrix P&L Calculator</h2>
        <p className="description">
          This matrix calculator displays profit & loss at each trading level
          based on your buying power and current average premiums. The "Level
          Exit Profits" column shows what your profit would be if you win at
          that level, accounting for any previous level losses.
        </p>
        <div className="strategy-info">
          <h3>Strategy Information:</h3>
          <ul>
            <li>
              <strong>Standard Matrix:</strong> Levels 2-5 with base contract
              counts from the selected matrix
            </li>
            <li>
              <strong>Stacked Matrix:</strong> Levels 2-5, but Level 3 includes
              the contracts from Level 2
            </li>
            <li>
              <strong>Shifted Matrix:</strong> Levels 3-7, where all trades are
              shifted one level up
            </li>
            <li>
              <strong>Level Exit Profits</strong> show what profit you'd make if
              winning at that level after taking max losses on all previous
              levels
            </li>
            <li>
              <strong>Custom Premiums:</strong> When using custom premiums, a 2%
              capital buffer is maintained and final level contracts are
              optimized for profitability
            </li>
          </ul>
        </div>
        <div className="input-grid">
          <div className="input-group">
            <label>Default Premium/Contract ($)</label>
            <NumericInput
              value={defaultPremium}
              onChange={(value) => setDefaultPremium(Number(value))}
              step="0.01"
              min={0}
            />
          </div>

          <div className="input-group">
            <label>Total Fees per IC ($)</label>
            <NumericInput
              value={feesPerIC}
              onChange={(value) => setFeesPerIC(Number(value))}
              step="0.01"
              min={0}
            />
          </div>

          <div className="input-group">
            <label>Select Matrix Option</label>
            <select
              value={selectedMatrix}
              onChange={(e) => setSelectedMatrix(e.target.value)}
              className="select-input"
            >
              {Object.keys(matrixData.standard).map((matrix) => (
                <option key={matrix} value={matrix}>
                  {matrix}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Matrix Type</label>
            <select
              value={matrixType}
              onChange={(e) => setMatrixType(e.target.value)}
              className="select-input"
            >
              <option value="STANDARD MATRIX">Standard Matrix</option>
              <option value="STACKED MATRIX">Stacked Matrix</option>
              <option value="SHIFTED MATRIX">Shifted Matrix</option>
            </select>
          </div>
        </div>

        {/* Level-Specific Premiums Section */}
        <div className="level-inputs">
          <div className="level-inputs-header">
            <div>
              <h3>Level-Specific Premiums</h3>
              <p>
                Adjust premium values for each level to calculate appropriate
                contract sizing adjustments.
              </p>
            </div>
            <div>
              <h3>Custom Quantities</h3>
              <p>
                Enter custom quantities if you've been instructed to use
                specific contract numbers.
              </p>
            </div>
          </div>

          <div className="level-grid">
            <div className="level-column">
              <div className="level-input">
                <label>Level 2 Premium</label>
                <NumericInput
                  value={premiumLevels["Level 2"]}
                  onChange={(value) => {
                    const newPremiums = { ...premiumLevels };
                    newPremiums["Level 2"] = value;
                    setPremiumLevels(newPremiums);
                  }}
                  step="0.05"
                  min={0}
                />
              </div>
              <div className="level-input">
                <label>Level 3 Premium</label>
                <NumericInput
                  value={premiumLevels["Level 3"]}
                  onChange={(value) => {
                    const newPremiums = { ...premiumLevels };
                    newPremiums["Level 3"] = value;
                    setPremiumLevels(newPremiums);
                  }}
                  step="0.05"
                  min={0}
                />
              </div>
              <div className="level-input">
                <label>Level 4 Premium</label>
                <NumericInput
                  value={premiumLevels["Level 4"]}
                  onChange={(value) => {
                    const newPremiums = { ...premiumLevels };
                    newPremiums["Level 4"] = value;
                    setPremiumLevels(newPremiums);
                  }}
                  step="0.05"
                  min={0}
                />
              </div>
              <div className="level-input">
                <label>Level 5 Premium</label>
                <NumericInput
                  value={premiumLevels["Level 5"]}
                  onChange={(value) => {
                    const newPremiums = { ...premiumLevels };
                    newPremiums["Level 5"] = value;
                    setPremiumLevels(newPremiums);
                  }}
                  step="0.05"
                  min={0}
                />
              </div>
              {matrixType === "SHIFTED MATRIX" && (
                <>
                  <div className="level-input">
                    <label>Level 6 Premium</label>
                    <NumericInput
                      value={premiumLevels["Level 6"]}
                      onChange={(value) => {
                        const newPremiums = { ...premiumLevels };
                        newPremiums["Level 6"] = value;
                        setPremiumLevels(newPremiums);
                      }}
                      step="0.05"
                      min={0}
                    />
                  </div>
                  <div className="level-input">
                    <label>Level 7 Premium</label>
                    <NumericInput
                      value={premiumLevels["Level 7"]}
                      onChange={(value) => {
                        const newPremiums = { ...premiumLevels };
                        newPremiums["Level 7"] = value;
                        setPremiumLevels(newPremiums);
                      }}
                      step="0.05"
                      min={0}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="level-column">
              <div className="level-input">
                <label>Level 2 Custom Qty</label>
                <NumericInput
                  value={customQuantities["Level 2"]}
                  onChange={(value) => {
                    const newCustomQty = { ...customQuantities };
                    newCustomQty["Level 2"] = value;
                    setCustomQuantities(newCustomQty);
                  }}
                  placeholder="Optional"
                  step="1"
                  min={0}
                  isCustomQuantity={true}
                />
              </div>
              <div className="level-input">
                <label>Level 3 Custom Qty</label>
                <NumericInput
                  value={customQuantities["Level 3"]}
                  onChange={(value) => {
                    const newCustomQty = { ...customQuantities };
                    newCustomQty["Level 3"] = value;
                    setCustomQuantities(newCustomQty);
                  }}
                  placeholder="Optional"
                  step="1"
                  min={0}
                  isCustomQuantity={true}
                />
              </div>
              <div className="level-input">
                <label>Level 4 Custom Qty</label>
                <NumericInput
                  value={customQuantities["Level 4"]}
                  onChange={(value) => {
                    const newCustomQty = { ...customQuantities };
                    newCustomQty["Level 4"] = value;
                    setCustomQuantities(newCustomQty);
                  }}
                  placeholder="Optional"
                  step="1"
                  min={0}
                  isCustomQuantity={true}
                />
              </div>
              <div className="level-input">
                <label>Level 5 Custom Qty</label>
                <NumericInput
                  value={customQuantities["Level 5"]}
                  onChange={(value) => {
                    const newCustomQty = { ...customQuantities };
                    newCustomQty["Level 5"] = value;
                    setCustomQuantities(newCustomQty);
                  }}
                  placeholder="Optional"
                  step="1"
                  min={0}
                  isCustomQuantity={true}
                />
              </div>
              {matrixType === "SHIFTED MATRIX" && (
                <>
                  <div className="level-input">
                    <label>Level 6 Custom Qty</label>
                    <NumericInput
                      value={customQuantities["Level 6"]}
                      onChange={(value) => {
                        const newCustomQty = { ...customQuantities };
                        newCustomQty["Level 6"] = value;
                        setCustomQuantities(newCustomQty);
                      }}
                      placeholder="Optional"
                      step="1"
                      min={0}
                      isCustomQuantity={true}
                    />
                  </div>
                  <div className="level-input">
                    <label>Level 7 Custom Qty</label>
                    <NumericInput
                      value={customQuantities["Level 7"]}
                      onChange={(value) => {
                        const newCustomQty = { ...customQuantities };
                        newCustomQty["Level 7"] = value;
                        setCustomQuantities(newCustomQty);
                      }}
                      placeholder="Optional"
                      step="1"
                      min={0}
                      isCustomQuantity={true}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Custom Premium Note */}
        {hasCustomPremiums && (
          <div
            style={{
              backgroundColor: "#f0f9ff",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "1rem",
              borderLeft: "4px solid #4361ee",
            }}
          >
            <p style={{ margin: 0, fontWeight: "500" }}>
              <strong>Note:</strong> Using custom premiums with a 2% capital
              buffer (${(getTradingCapital() * 0.02).toFixed(2)} capital
              reserved). Final level contracts are optimized for overall
              profitability.
            </p>
          </div>
        )}

        {/* Level Optimization */}
        <div className="level-inputs">
          <div className="level-inputs-header">
            <div>
              <h3>Level Optimization</h3>
              <p>
                Specify if a level was closed early and at what premium. This
                affects capital requirements and profit/loss calculations.
              </p>
            </div>
          </div>

          <div className="level-grid">
            <div className="level-column">
              <div className="level-input">
                <label>Level 2</label>
                <div className="optimization-controls">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="closed-early-Level 2"
                      checked={
                        levelOptimizations["Level 2"]?.closedEarly || false
                      }
                      onChange={(e) => {
                        const newOptimizations = { ...levelOptimizations };
                        if (!newOptimizations["Level 2"]) {
                          newOptimizations["Level 2"] = {
                            closedEarly: false,
                            closingPremium: "",
                          };
                        }
                        newOptimizations["Level 2"].closedEarly =
                          e.target.checked;
                        setLevelOptimizations(newOptimizations);
                      }}
                    />
                    <label htmlFor="closed-early-Level 2">Closed Early</label>
                  </div>
                  <NumericInput
                    value={levelOptimizations["Level 2"]?.closingPremium || ""}
                    onChange={(value) => {
                      const newOptimizations = { ...levelOptimizations };
                      if (!newOptimizations["Level 2"]) {
                        newOptimizations["Level 2"] = {
                          closedEarly: false,
                          closingPremium: "",
                        };
                      }
                      newOptimizations["Level 2"].closingPremium = value;
                      setLevelOptimizations(newOptimizations);
                    }}
                    placeholder="Closing Premium"
                    step="0.05"
                    min={0}
                    disabled={!levelOptimizations["Level 2"]?.closedEarly}
                    isCustomQuantity={true}
                  />
                </div>
              </div>

              <div className="level-input">
                <label>Level 3</label>
                <div className="optimization-controls">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="closed-early-Level 3"
                      checked={
                        levelOptimizations["Level 3"]?.closedEarly || false
                      }
                      onChange={(e) => {
                        const newOptimizations = { ...levelOptimizations };
                        if (!newOptimizations["Level 3"]) {
                          newOptimizations["Level 3"] = {
                            closedEarly: false,
                            closingPremium: "",
                          };
                        }
                        newOptimizations["Level 3"].closedEarly =
                          e.target.checked;
                        setLevelOptimizations(newOptimizations);
                      }}
                    />
                    <label htmlFor="closed-early-Level 3">Closed Early</label>
                  </div>
                  <NumericInput
                    value={levelOptimizations["Level 3"]?.closingPremium || ""}
                    onChange={(value) => {
                      const newOptimizations = { ...levelOptimizations };
                      if (!newOptimizations["Level 3"]) {
                        newOptimizations["Level 3"] = {
                          closedEarly: false,
                          closingPremium: "",
                        };
                      }
                      newOptimizations["Level 3"].closingPremium = value;
                      setLevelOptimizations(newOptimizations);
                    }}
                    placeholder="Closing Premium"
                    step="0.05"
                    min={0}
                    disabled={!levelOptimizations["Level 3"]?.closedEarly}
                    isCustomQuantity={true}
                  />
                </div>
              </div>

              <div className="level-input">
                <label>Level 4</label>
                <div className="optimization-controls">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="closed-early-Level 4"
                      checked={
                        levelOptimizations["Level 4"]?.closedEarly || false
                      }
                      onChange={(e) => {
                        const newOptimizations = { ...levelOptimizations };
                        if (!newOptimizations["Level 4"]) {
                          newOptimizations["Level 4"] = {
                            closedEarly: false,
                            closingPremium: "",
                          };
                        }
                        newOptimizations["Level 4"].closedEarly =
                          e.target.checked;
                        setLevelOptimizations(newOptimizations);
                      }}
                    />
                    <label htmlFor="closed-early-Level 4">Closed Early</label>
                  </div>
                  <NumericInput
                    value={levelOptimizations["Level 4"]?.closingPremium || ""}
                    onChange={(value) => {
                      const newOptimizations = { ...levelOptimizations };
                      if (!newOptimizations["Level 4"]) {
                        newOptimizations["Level 4"] = {
                          closedEarly: false,
                          closingPremium: "",
                        };
                      }
                      newOptimizations["Level 4"].closingPremium = value;
                      setLevelOptimizations(newOptimizations);
                    }}
                    placeholder="Closing Premium"
                    step="0.05"
                    min={0}
                    disabled={!levelOptimizations["Level 4"]?.closedEarly}
                    isCustomQuantity={true}
                  />
                </div>
              </div>
            </div>

            <div className="level-column">
              <div className="level-input">
                <label>Level 5</label>
                <div className="optimization-controls">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="closed-early-Level 5"
                      checked={
                        levelOptimizations["Level 5"]?.closedEarly || false
                      }
                      onChange={(e) => {
                        const newOptimizations = { ...levelOptimizations };
                        if (!newOptimizations["Level 5"]) {
                          newOptimizations["Level 5"] = {
                            closedEarly: false,
                            closingPremium: "",
                          };
                        }
                        newOptimizations["Level 5"].closedEarly =
                          e.target.checked;
                        setLevelOptimizations(newOptimizations);
                      }}
                    />
                    <label htmlFor="closed-early-Level 5">Closed Early</label>
                  </div>
                  <NumericInput
                    value={levelOptimizations["Level 5"]?.closingPremium || ""}
                    onChange={(value) => {
                      const newOptimizations = { ...levelOptimizations };
                      if (!newOptimizations["Level 5"]) {
                        newOptimizations["Level 5"] = {
                          closedEarly: false,
                          closingPremium: "",
                        };
                      }
                      newOptimizations["Level 5"].closingPremium = value;
                      setLevelOptimizations(newOptimizations);
                    }}
                    placeholder="Closing Premium"
                    step="0.05"
                    min={0}
                    disabled={!levelOptimizations["Level 5"]?.closedEarly}
                    isCustomQuantity={true}
                  />
                </div>
              </div>

              {matrixType === "SHIFTED MATRIX" && (
                <>
                  <div className="level-input">
                    <label>Level 6</label>
                    <div className="optimization-controls">
                      <div className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          id="closed-early-Level 6"
                          checked={
                            levelOptimizations["Level 6"]?.closedEarly || false
                          }
                          onChange={(e) => {
                            const newOptimizations = {
                              ...levelOptimizations,
                            };
                            if (!newOptimizations["Level 6"]) {
                              newOptimizations["Level 6"] = {
                                closedEarly: false,
                                closingPremium: "",
                              };
                            }
                            newOptimizations["Level 6"].closedEarly =
                              e.target.checked;
                            setLevelOptimizations(newOptimizations);
                          }}
                        />
                        <label htmlFor="closed-early-Level 6">
                          Closed Early
                        </label>
                      </div>
                      <NumericInput
                        value={
                          levelOptimizations["Level 6"]?.closingPremium || ""
                        }
                        onChange={(value) => {
                          const newOptimizations = { ...levelOptimizations };
                          if (!newOptimizations["Level 6"]) {
                            newOptimizations["Level 6"] = {
                              closedEarly: false,
                              closingPremium: "",
                            };
                          }
                          newOptimizations["Level 6"].closingPremium = value;
                          setLevelOptimizations(newOptimizations);
                        }}
                        placeholder="Closing Premium"
                        step="0.05"
                        min={0}
                        disabled={!levelOptimizations["Level 6"]?.closedEarly}
                        isCustomQuantity={true}
                      />
                    </div>
                  </div>

                  <div className="level-input">
                    <label>Level 7</label>
                    <div className="optimization-controls">
                      <div className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          id="closed-early-Level 7"
                          checked={
                            levelOptimizations["Level 7"]?.closedEarly || false
                          }
                          onChange={(e) => {
                            const newOptimizations = {
                              ...levelOptimizations,
                            };
                            if (!newOptimizations["Level 7"]) {
                              newOptimizations["Level 7"] = {
                                closedEarly: false,
                                closingPremium: "",
                              };
                            }
                            newOptimizations["Level 7"].closedEarly =
                              e.target.checked;
                            setLevelOptimizations(newOptimizations);
                          }}
                        />
                        <label htmlFor="closed-early-Level 7">
                          Closed Early
                        </label>
                      </div>
                      <NumericInput
                        value={
                          levelOptimizations["Level 7"]?.closingPremium || ""
                        }
                        onChange={(value) => {
                          const newOptimizations = { ...levelOptimizations };
                          if (!newOptimizations["Level 7"]) {
                            newOptimizations["Level 7"] = {
                              closedEarly: false,
                              closingPremium: "",
                            };
                          }
                          newOptimizations["Level 7"].closingPremium = value;
                          setLevelOptimizations(newOptimizations);
                        }}
                        placeholder="Closing Premium"
                        step="0.05"
                        min={0}
                        disabled={!levelOptimizations["Level 7"]?.closedEarly}
                        isCustomQuantity={true}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Results Display */}
        <div className="desktop-card-view">
          {matrixResults.map((result) => (
            <div
              key={result.level}
              className={`desktop-result-card ${
                result.closedEarly
                  ? "closed-early-row"
                  : result.hasCustomQuantity
                  ? "custom-qty"
                  : result.baseContracts > 0 &&
                    result.baseContracts !== result.adjustedContracts
                  ? "adjusted-qty"
                  : ""
              }`}
            >
              <div className="desktop-result-header">
                <div className="desktop-result-level">
                  Level {result.level.replace("Level ", "")}
                </div>
                {result.closedEarly && (
                  <div className="desktop-closed-indicator">Closed Early</div>
                )}
              </div>

              <div className="desktop-result-grid">
                <div className="desktop-result-item">
                  <div className="desktop-result-label">Premium</div>
                  <div className="desktop-result-value">
                    ${result.premiumCollected.toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">Contracts</div>
                  <div className="desktop-result-value">
                    {result.baseContracts}
                    {result.baseContracts !== result.adjustedContracts
                      ? ` → ${result.adjustedContracts}`
                      : ""}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">
                    Level {result.level.replace("Level ", "")} Gross P&L
                  </div>
                  <div className="desktop-result-value">
                    ${result.grossProfit.toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">
                    Level {result.level.replace("Level ", "")} Net P&L
                  </div>
                  <div className="desktop-result-value">
                    $
                    {result.closedEarly
                      ? result.actualProfitLoss.toFixed(2)
                      : result.netProfit.toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">Fees</div>
                  <div className="desktop-result-value">
                    $
                    {(
                      result.estimatedFees +
                      (result.closedEarly ? result.closingFees : 0)
                    ).toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">Level Exit Profits</div>
                  <div
                    className={`desktop-result-value ${
                      result.levelExitProfit >= 0 ? "profit" : "loss"
                    }`}
                  >
                    ${result.levelExitProfit.toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">Level Max Risk</div>
                  <div className="desktop-result-value">
                    ${result.maxLossThisLevel.toFixed(2)}
                  </div>
                </div>

                <div className="desktop-result-item">
                  <div className="desktop-result-label">Remaining BP</div>
                  <div className="desktop-result-value">
                    ${result.remainingCapital.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Results View */}
        <div className="mobile-results">
          {matrixResults.map((result) => (
            <div
              key={result.level}
              className={`mobile-result-card ${
                result.closedEarly
                  ? "closed-early-row"
                  : result.hasCustomQuantity
                  ? "custom-qty"
                  : result.baseContracts > 0 &&
                    result.baseContracts !== result.adjustedContracts
                  ? "adjusted-qty"
                  : ""
              }`}
            >
              {result.hasCustomQuantity && (
                <div className="mobile-custom-indicator">C</div>
              )}

              <div className="mobile-result-header">
                <div className="mobile-result-level">
                  Level {result.level.replace("Level ", "")}
                </div>
                {result.closedEarly && (
                  <div className="mobile-closed-indicator">Closed Early</div>
                )}
              </div>

              <div className="mobile-result-grid">
                <div className="mobile-result-item">
                  <div className="mobile-result-label">Premium</div>
                  <div className="mobile-result-value">
                    ${result.premiumCollected.toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">Contracts</div>
                  <div className="mobile-result-value">
                    {result.baseContracts}
                    {result.baseContracts !== result.adjustedContracts
                      ? ` → ${result.adjustedContracts}`
                      : ""}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">
                    Level {result.level.replace("Level ", "")} Gross P&L
                  </div>
                  <div className="mobile-result-value">
                    ${result.grossProfit.toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">
                    Level {result.level.replace("Level ", "")} Net P&L
                  </div>
                  <div className="mobile-result-value">
                    $
                    {result.closedEarly
                      ? result.actualProfitLoss.toFixed(2)
                      : result.netProfit.toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">Fees</div>
                  <div className="mobile-result-value">
                    $
                    {(
                      result.estimatedFees +
                      (result.closedEarly ? result.closingFees : 0)
                    ).toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">Level Exit Profits</div>
                  <div
                    className={`mobile-result-value ${
                      result.levelExitProfit >= 0 ? "profit" : "loss"
                    }`}
                  >
                    ${result.levelExitProfit.toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">Level Max Risk</div>
                  <div className="mobile-result-value">
                    ${result.maxLossThisLevel.toFixed(2)}
                  </div>
                </div>

                <div className="mobile-result-item">
                  <div className="mobile-result-label">Remaining BP</div>
                  <div className="mobile-result-value">
                    ${result.remainingCapital.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // SECTION 8: INDIVIDUAL TRADE CALCULATOR UI AND MAIN RENDER
  const renderIndividualTradeCalculator = () => {
    return (
      <div className="card">
        <h2>Individual Trade Calculator</h2>
        <p className="description">
          This calculator determines exact P&L for a specific trade, including
          any optimizations you may make.
        </p>

        <div className="input-grid">
          <div className="input-group">
            <label># Contracts</label>
            <NumericInput
              value={numContracts}
              onChange={(value) => setNumContracts(Number(value))}
              min={1}
              step="1"
            />
          </div>

          <div className="input-group">
            <label>Sell Put Strike</label>
            <NumericInput
              value={sellPut}
              onChange={(value) => setSellPut(Number(value))}
              step="5"
            />
          </div>

          <div className="input-group">
            <label>Sell Call Strike</label>
            <NumericInput
              value={sellCall}
              onChange={(value) => setSellCall(Number(value))}
              step="5"
            />
          </div>

          <div className="input-group">
            <label>Premium To Open ($)</label>
            <NumericInput
              value={premiumToOpen}
              onChange={(value) => setPremiumToOpen(Number(value))}
              step="0.01"
              min={0}
            />
          </div>

          <div className="input-group">
            <label>SPX Closing Price</label>
            <NumericInput
              value={spxClosingPrice}
              onChange={(value) => setSpxClosingPrice(Number(value))}
              step="0.01"
            />
          </div>

          <div className="input-group">
            <label>Opening Fees (per contract)</label>
            <NumericInput
              value={openingFees}
              onChange={(value) => setOpeningFees(Number(value))}
              step="0.01"
              min={0}
            />
          </div>

          <div className="input-group">
            <label>Optimized? (Which sides closed early)</label>
            <select
              value={optimizationType}
              onChange={(e) => setOptimizationType(e.target.value)}
              className="select-input"
            >
              <option value="No Optimization">No Optimization</option>
              <option value="FULL IC">Full IC</option>
              <option value="PUT ONLY">Put Only</option>
              <option value="CALL ONLY">Call Only</option>
            </select>
          </div>

          <div className="input-group">
            <label>Premium To Close/Optimize ($)</label>
            <NumericInput
              value={premiumToClose}
              onChange={(value) => setPremiumToClose(Number(value))}
              step="0.01"
              min={0}
              disabled={optimizationType === "No Optimization"}
            />
          </div>
        </div>

        <div className="results-container">
          <h3>Trade Results</h3>
          <div className="results-grid">
            <div className="result-card">
              <div className="result-label">Gross P&L</div>
              <div className="result-value">
                ${individualTradeResults.grossPL.toFixed(2)}
              </div>
            </div>
            <div className="result-card">
              <div className="result-label">Optimization Fees</div>
              <div className="result-value">
                ${individualTradeResults.optimizationFees.toFixed(2)}
              </div>
            </div>
            <div className="result-card">
              <div className="result-label">Total Fees</div>
              <div className="result-value">
                ${individualTradeResults.totalFees.toFixed(2)}
              </div>
            </div>
            <div className="result-card">
              <div className="result-label">Net P&L</div>
              <div
                className={`result-value ${
                  individualTradeResults.netPL >= 0 ? "profit" : "loss"
                }`}
              >
                ${individualTradeResults.netPL.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="calculator-container">
      {/* Header */}
      <div className="header">
        <h1>SPX Matrix Calculator</h1>
      </div>

      {/* Tabs */}
      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === "matrix" ? "active" : ""}`}
          onClick={() => setActiveTab("matrix")}
        >
          Matrix P&L Calculator
        </button>
        <button
          className={`tab-button ${activeTab === "individual" ? "active" : ""}`}
          onClick={() => setActiveTab("individual")}
        >
          Individual Trade Calculator
        </button>
      </div>

      {/* Render the active calculator */}
      {activeTab === "matrix"
        ? renderMatrixCalculator()
        : renderIndividualTradeCalculator()}
    </div>
  );
};

export default IronCondorCalculator;
