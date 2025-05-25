import React, { useState, useEffect } from "react";
import "./MatrixCompounding.css";

// Reuse the NumericInput component from IronCondorCalculator
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
  // Maintain an internal string state for the input field
  const [localInputValue, setLocalInputValue] = useState<string>(
    value === "" ? "" : String(value)
  );

  // Track if the user is currently editing - this prevents reverting to default
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Update the local input value when the parent component updates the value
  // But only if the user is not actively editing the field
  useEffect(() => {
    if (!isEditing) {
      setLocalInputValue(value === "" ? "" : String(value));
    }
  }, [value, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // User is now editing
    setIsEditing(true);

    // Always update the local input field to allow backspace deletion
    setLocalInputValue(newValue);

    // For parent component updates
    if (newValue === "") {
      // Send the empty string up to parent for both premium and custom quantity
      onChange("");
    } else if (!isNaN(Number(newValue))) {
      // Only send valid numbers to parent
      onChange(Number(newValue));
    }
  };
  // When input loses focus, handle empty values appropriately
  const handleBlur = () => {
    // No longer editing when focus is lost
    setIsEditing(false);

    // For custom quantities, empty is allowed
    if (localInputValue === "" && !isCustomQuantity) {
      // For premium values, if completely empty when losing focus and
      // not a custom quantity, we can either keep empty or set to 0
      // Here we'll keep it empty to match your preference
      // Don't set a default: setLocalInputValue("0"); onChange(0);
    } else if (localInputValue !== "") {
      // If it's a valid number and not empty, format it
      const num = Number(localInputValue);
      if (!isNaN(num)) {
        setLocalInputValue(String(num));
      }
    }
  };

  // When input gains focus, track that we're editing
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

// Level optimization interface (copied from IronCondorCalculator)
interface LevelOptimizationType {
  [key: string]: {
    closedEarly: boolean;
    closingPremium: number | string;
  };
}

interface CompoundingResult {
  level: string;
  baseContracts: number;
  premium: number;
  grossProfit: number;
  estimatedFees: number;
  netProfit: number;
  maxLossPerContract: number;
  maxLossThisLevel: number;
  cumulativeMaxLosses: number;
  capitalRequired: number;
  remainingCapital: number;
  levelExitProfit: number;
  closedEarly: boolean;
  closingPremium: number;
  closingFees: number;
  actualProfitLoss: number;
  maxRisk: number; // Added for total max risk calculation
}

// Define interfaces for the table entries
interface ShiftedTableEntry {
  bp: number;
  l3: number;
  l4: number;
  l5: number;
  l6: number;
}

interface StandardTableEntry {
  bp: number;
  l2: number;
  l3: number;
  l4: number;
  l5: number;
}

const MatrixCompounding: React.FC = () => {
  // State variables for sliders and inputs
  const [buyingPower, setBuyingPower] = useState<number>(26350); // Start with $26,350
  const [expectedPremium, setExpectedPremium] = useState<number>(1.75); // Start with $1.75
  const [commFees, setCommFees] = useState<number>(6.56); // Commissions and fees per IC
  const [matrixType, setMatrixType] = useState<string>("standard"); // standard, stacked, or shifted

  // Fixed spread width - only trading 5-wide spreads for now
  const spreadWidth = 5;

  // Level-specific premiums state - default Level 5 and 6 to 1.65 for profitability
  const [levelPremiums, setLevelPremiums] = useState<{
    [key: string]: number | string;
  }>({
    "Level 2": 1.75,
    "Level 3": 1.75,
    "Level 4": 1.75,
    "Level 5": 1.65, // Set to 1.65 for profitability
    "Level 6": 1.65, // Set to 1.65 for profitability
    "Level 7": 1.65,
  });

  // Track which level premiums have been customized
  const [levelPremiumsCustomized, setLevelPremiumsCustomized] = useState<{
    [key: string]: boolean;
  }>({
    "Level 2": false,
    "Level 3": false,
    "Level 4": false,
    "Level 5": false,
    "Level 6": false,
    "Level 7": false,
  });

  // Level optimizations for early closures (copied from IronCondorCalculator)
  const [levelOptimizations, setLevelOptimizations] =
    useState<LevelOptimizationType>({
      "Level 2": { closedEarly: false, closingPremium: "" },
      "Level 3": { closedEarly: false, closingPremium: "" },
      "Level 4": { closedEarly: false, closingPremium: "" },
      "Level 5": { closedEarly: false, closingPremium: "" },
      "Level 6": { closedEarly: false, closingPremium: "" },
      "Level 7": { closedEarly: false, closingPremium: "" },
    });

  // Updated useEffect for premium management with enhanced profitability
  useEffect(() => {
    // Only update level premiums if custom premiums haven't been set
    setLevelPremiums((prevPremiums) => {
      const newPremiums = { ...prevPremiums };
      Object.keys(newPremiums).forEach((level) => {
        // Only update if the user hasn't manually changed this level's premium
        if (!levelPremiumsCustomized[level]) {
          // Base premium for all levels is the expected premium
          let basePremium = expectedPremium;

          // For final levels, use at least 1.65 to help ensure profitability
          if (
            level === "Level 5" ||
            level === "Level 6" ||
            level === "Level 7"
          ) {
            // For higher buying powers or final levels, we need higher premiums
            // to ensure profitability
            if (buyingPower > 30000) {
              // For very large accounts, scale premium slightly higher
              const bpFactor = Math.min(
                1.1,
                1 + (buyingPower - 30000) / 100000
              );
              basePremium = Math.max(1.65, expectedPremium) * bpFactor;

              // Cap at 2.0 for user expectations
              basePremium = Math.min(2.0, basePremium);
            } else {
              // Standard final level adjustment
              basePremium = Math.max(1.65, expectedPremium);
            }
          }

          newPremiums[level] = basePremium;
        }
      });
      return newPremiums;
    });
  }, [expectedPremium, levelPremiumsCustomized, buyingPower]);

  // Function to handle individual level premium changes
  const handleLevelPremiumChange = (level: string, value: number | string) => {
    // Update level premiums
    if (value !== "" && !isNaN(Number(value))) {
      const numValue = Math.max(1.6, Math.min(2.5, Number(value)));
      setLevelPremiums((prev) => ({
        ...prev,
        [level]: numValue,
      }));

      // Mark this level as customized
      setLevelPremiumsCustomized((prev) => ({
        ...prev,
        [level]: true,
      }));
    } else {
      // Handle empty string case
      setLevelPremiums((prev) => ({
        ...prev,
        [level]: value,
      }));
    }
  };

  // Helper function to get contract counts based on reference tables
  const getTableBasedContracts = (
    bp: number,
    level: string,
    matrixType: string
  ): number => {
    // Standard matrix reference table (Level 2 Start Matrix)
    const standardTable: StandardTableEntry[] = [
      { bp: 11800, l2: 0, l3: 2, l4: 8, l5: 24 },
      { bp: 16300, l2: 0, l3: 3, l4: 11, l5: 33 },
      { bp: 21900, l2: 1, l3: 4, l4: 14, l5: 44 },
      { bp: 26350, l2: 1, l3: 5, l4: 17, l5: 53 },
      { bp: 30850, l2: 1, l3: 6, l4: 20, l5: 62 },
      { bp: 33300, l2: 2, l3: 6, l4: 21, l5: 67 },
      { bp: 36400, l2: 2, l3: 7, l4: 23, l5: 73 },
    ];

    // Shifted matrix reference table
    const shiftedTable: ShiftedTableEntry[] = [
      { bp: 11800, l3: 0, l4: 2, l5: 8, l6: 24 },
      { bp: 16300, l3: 0, l4: 3, l5: 11, l6: 33 },
      { bp: 21900, l3: 1, l4: 4, l5: 14, l6: 44 },
      { bp: 26350, l3: 1, l4: 5, l5: 17, l6: 53 },
      { bp: 30850, l3: 1, l4: 6, l5: 20, l6: 62 },
      { bp: 33300, l3: 2, l4: 6, l5: 21, l6: 67 },
      { bp: 36400, l3: 2, l4: 7, l5: 23, l6: 73 },
    ];

    // Select the appropriate reference table based on matrix type
    const isShifted = matrixType === "shifted";

    // Choose the appropriate table
    const table = isShifted ? shiftedTable : standardTable;

    // Find the two reference points that bracket the current buying power
    let lowerRef = table[0];
    let upperRef = table[table.length - 1];

    for (let i = 0; i < table.length - 1; i++) {
      if (bp >= table[i].bp && bp < table[i + 1].bp) {
        lowerRef = table[i];
        upperRef = table[i + 1];
        break;
      }
    }

    // If buying power is lower than the lowest reference, use the lowest reference
    if (bp < lowerRef.bp) {
      if (isShifted) {
        const shiftedLowerRef = lowerRef as ShiftedTableEntry;
        if (level === "Level 3") return shiftedLowerRef.l3;
        if (level === "Level 4") return shiftedLowerRef.l4;
        if (level === "Level 5") return shiftedLowerRef.l5;
        if (level === "Level 6") return shiftedLowerRef.l6;
      } else {
        const standardLowerRef = lowerRef as StandardTableEntry;
        if (level === "Level 2") return standardLowerRef.l2;
        if (level === "Level 3") return standardLowerRef.l3;
        if (level === "Level 4") return standardLowerRef.l4;
        if (level === "Level 5") return standardLowerRef.l5;
      }
      return 0;
    }

    // If buying power is higher than the highest reference, scale based on the highest reference
    if (bp >= upperRef.bp) {
      const scaleFactor = bp / upperRef.bp;
      if (isShifted) {
        const shiftedUpperRef = upperRef as ShiftedTableEntry;
        if (level === "Level 3")
          return Math.round(shiftedUpperRef.l3 * scaleFactor);
        if (level === "Level 4")
          return Math.round(shiftedUpperRef.l4 * scaleFactor);
        if (level === "Level 5")
          return Math.round(shiftedUpperRef.l5 * scaleFactor);
        if (level === "Level 6")
          return Math.round(shiftedUpperRef.l6 * scaleFactor);
      } else {
        const standardUpperRef = upperRef as StandardTableEntry;
        if (level === "Level 2")
          return Math.round(standardUpperRef.l2 * scaleFactor);
        if (level === "Level 3")
          return Math.round(standardUpperRef.l3 * scaleFactor);
        if (level === "Level 4")
          return Math.round(standardUpperRef.l4 * scaleFactor);
        if (level === "Level 5")
          return Math.round(standardUpperRef.l5 * scaleFactor);
      }
      return 0;
    }

    // Linear interpolation between the lower and upper reference points
    const bpRange = upperRef.bp - lowerRef.bp;
    const position = (bp - lowerRef.bp) / bpRange;

    if (isShifted) {
      const shiftedLowerRef = lowerRef as ShiftedTableEntry;
      const shiftedUpperRef = upperRef as ShiftedTableEntry;

      if (level === "Level 3") {
        return Math.round(
          shiftedLowerRef.l3 +
            position * (shiftedUpperRef.l3 - shiftedLowerRef.l3)
        );
      }
      if (level === "Level 4") {
        return Math.round(
          shiftedLowerRef.l4 +
            position * (shiftedUpperRef.l4 - shiftedLowerRef.l4)
        );
      }
      if (level === "Level 5") {
        return Math.round(
          shiftedLowerRef.l5 +
            position * (shiftedUpperRef.l5 - shiftedLowerRef.l5)
        );
      }
      if (level === "Level 6") {
        return Math.round(
          shiftedLowerRef.l6 +
            position * (shiftedUpperRef.l6 - shiftedLowerRef.l6)
        );
      }
    } else {
      const standardLowerRef = lowerRef as StandardTableEntry;
      const standardUpperRef = upperRef as StandardTableEntry;

      if (level === "Level 2") {
        return Math.round(
          standardLowerRef.l2 +
            position * (standardUpperRef.l2 - standardLowerRef.l2)
        );
      }
      if (level === "Level 3") {
        return Math.round(
          standardLowerRef.l3 +
            position * (standardUpperRef.l3 - standardLowerRef.l3)
        );
      }
      if (level === "Level 4") {
        return Math.round(
          standardLowerRef.l4 +
            position * (standardUpperRef.l4 - standardLowerRef.l4)
        );
      }
      if (level === "Level 5") {
        return Math.round(
          standardLowerRef.l5 +
            position * (standardUpperRef.l5 - standardLowerRef.l5)
        );
      }
    }

    return 0;
  };

  // Function to ensure level is profitable with given premium
  const ensureLevelProfitability = (
    contractCount: number,
    premiumForLevel: number,
    commFees: number,
    cumulativeMaxLosses: number
  ): number => {
    // Calculate profit per contract
    const profitPerContract = premiumForLevel * 100 - commFees;

    if (profitPerContract <= 0) {
      // If premium is too low to be profitable per contract, we can't fix it
      return contractCount;
    }

    // Calculate minimum contracts needed for positive exit profit
    const minContractsNeeded = Math.ceil(
      (cumulativeMaxLosses + 1) / profitPerContract
    );

    // Return the higher of the two values
    return Math.max(contractCount, minContractsNeeded);
  };

  // Enhanced function to calculate compounding results with guaranteed profitability
  const calculateCompoundingResults = (): CompoundingResult[] => {
    const results: CompoundingResult[] = [];

    // Define the levels based on matrix type
    let levels: string[];
    if (matrixType === "standard") {
      levels = ["Level 2", "Level 3", "Level 4", "Level 5"];
    } else if (matrixType === "stacked") {
      levels = ["Level 2", "Level 3", "Level 4", "Level 5"];
    } else {
      // shifted
      levels = ["Level 3", "Level 4", "Level 5", "Level 6"];
    }

    // Apply 2% buffer to total buying power
    const bufferPercentage = 0.02; // 2% buffer
    const bufferAmount = buyingPower * bufferPercentage;
    const usableBuyingPower = buyingPower - bufferAmount;
    let remainingCapital = usableBuyingPower;

    // Track cumulative maximum losses for level exit profit calculations
    let totalContractsLost = 0; // Total contracts lost in previous levels
    let totalFeesLost = 0; // Total fees lost in previous levels
    let cumulativeMaxLosses = 0; // Total monetary value of losses in previous levels

    // Track how many levels we've processed
    let processedLevels = 0;
    const totalLevels = levels.length;

    // Process each level
    for (const level of levels) {
      processedLevels++;
      const isFinalLevel = processedLevels === totalLevels;

      // Use level-specific premium instead of global expectedPremium
      let premiumForLevel =
        levelPremiums[level] === "" || levelPremiums[level] === undefined
          ? expectedPremium
          : Number(levelPremiums[level]);

      // Calculate max loss per contract (without fees)
      const maxLossPerContract = spreadWidth * 100 - premiumForLevel * 100;
      const totalCostPerContract = maxLossPerContract + commFees;

      // Get base contract count from reference tables
      let baseContractCount = 0;

      // For standard matrix, get the contract count from the standard table
      // For shifted matrix, get the contract count from the shifted table
      // For stacked matrix, Level 2 is 0, other levels same as standard
      if (matrixType === "stacked" && level === "Level 2") {
        baseContractCount = 0;
      } else if (matrixType === "stacked" && level === "Level 3") {
        // For stacked matrix Level 3, use standard Level 2 + Level 3
        const standardL2 = getTableBasedContracts(
          buyingPower,
          "Level 2",
          "standard"
        );
        const standardL3 = getTableBasedContracts(
          buyingPower,
          "Level 3",
          "standard"
        );
        baseContractCount = standardL2 + standardL3;
      } else {
        baseContractCount = getTableBasedContracts(
          buyingPower,
          level,
          matrixType
        );
      }

      // Calculate maximum affordable contracts based on remaining capital
      const maxContractsByBP = Math.floor(
        remainingCapital / totalCostPerContract
      );

      // ENHANCED PROFITABILITY LOGIC FOR FINAL LEVEL
      if (isFinalLevel) {
        // If this is the final level, ensure it's profitable
        // even if we need to adjust the premium

        // First try with current premium
        const profitPerContract = premiumForLevel * 100 - commFees;

        if (profitPerContract > 0) {
          // Calculate minimum contracts needed for positive exit profit
          const minContractsNeeded = Math.ceil(
            (cumulativeMaxLosses + 1) / profitPerContract
          );

          // Check if we can afford enough contracts to be profitable
          if (minContractsNeeded > maxContractsByBP) {
            // We can't afford enough contracts at current premium
            // Calculate a higher premium that would make fewer contracts profitable
            const adjustedPremium =
              (cumulativeMaxLosses / maxContractsByBP + commFees + 1) / 100;

            // Cap premium at reasonable level (2.5 max)
            premiumForLevel = Math.min(
              2.5,
              Math.max(premiumForLevel, adjustedPremium)
            );

            // Recalculate costs with new premium
            const newMaxLossPerContract =
              spreadWidth * 100 - premiumForLevel * 100;
            const newTotalCostPerContract = newMaxLossPerContract + commFees;

            // Recalculate max contracts with new premium
            baseContractCount = Math.floor(
              remainingCapital / newTotalCostPerContract
            );

            // Log premium adjustment for debugging
            console.log(
              `Adjusted premium for ${level} to ${premiumForLevel.toFixed(
                2
              )} for profitability`
            );
          } else {
            // We can afford enough contracts with current premium
            // Ensure base contract count is at least minimum needed for profitability
            baseContractCount = Math.max(baseContractCount, minContractsNeeded);

            // But don't exceed what we can afford
            baseContractCount = Math.min(baseContractCount, maxContractsByBP);
          }
        } else {
          // Current premium is too low to be profitable per contract
          // Need higher premium just to break even per contract
          const minimumProfitablePremium = (commFees + 1) / 100;
          premiumForLevel = Math.min(
            2.5,
            Math.max(premiumForLevel, minimumProfitablePremium)
          );

          // Recalculate contracts with new premium
          const newMaxLossPerContract =
            spreadWidth * 100 - premiumForLevel * 100;
          const newTotalCostPerContract = newMaxLossPerContract + commFees;

          // Calculate how many contracts we need with new premium
          const newProfitPerContract = premiumForLevel * 100 - commFees;
          const minContractsNeeded = Math.ceil(
            cumulativeMaxLosses / newProfitPerContract
          );

          // Calculate what we can afford
          const newMaxContractsByBP = Math.floor(
            remainingCapital / newTotalCostPerContract
          );

          // Use affordable contracts, but at least minimum needed
          baseContractCount = Math.min(newMaxContractsByBP, minContractsNeeded);

          // If still not profitable, adjust again
          if (minContractsNeeded > newMaxContractsByBP) {
            const finalAdjustedPremium =
              (cumulativeMaxLosses / newMaxContractsByBP + commFees + 1) / 100;
            premiumForLevel = Math.min(2.5, finalAdjustedPremium);

            // Update costs again
            const finalMaxLossPerContract =
              spreadWidth * 100 - premiumForLevel * 100;
            const finalTotalCostPerContract =
              finalMaxLossPerContract + commFees;

            // Final contract count
            baseContractCount = Math.floor(
              remainingCapital / finalTotalCostPerContract
            );
          }

          console.log(
            `Premium was too low, adjusted to ${premiumForLevel.toFixed(
              2
            )} for ${level}`
          );
        }
      } else {
        // NON-FINAL LEVELS LOGIC
        // Adjust for premium differences for non-final levels
        // Reference premium is 1.75
        const referencePremium = 1.75;

        // Calculate premium adjustment ratio
        // Lower premium means we need more contracts to achieve same reward
        const premiumRatio = referencePremium / premiumForLevel;
        baseContractCount = Math.round(baseContractCount * premiumRatio);

        // Additional adjustment for max loss
        const baseMaxLoss = spreadWidth * 100 - referencePremium * 100;
        const actualMaxLoss = spreadWidth * 100 - premiumForLevel * 100;
        const maxLossRatio = actualMaxLoss / baseMaxLoss;

        baseContractCount = Math.round(baseContractCount / maxLossRatio);

        // Don't exceed available capital
        baseContractCount = Math.min(baseContractCount, maxContractsByBP);
      }

      // Final contract count calculation
      const finalContractCount = baseContractCount;

      // Calculate P&L
      const grossProfit = finalContractCount * premiumForLevel * 100;
      const estimatedFees = finalContractCount * commFees;
      const netProfit = grossProfit - estimatedFees;

      // Calculate max loss for this level (contracts only, without fees)
      const maxLossThisLevelContracts =
        finalContractCount * (spreadWidth * 100 - premiumForLevel * 100);

      // Total potential loss for this level (including fees)
      const potentialLossThisLevel = maxLossThisLevelContracts + estimatedFees;

      // Calculate total max risk including contract losses from all previous levels
      const maxRisk = potentialLossThisLevel + cumulativeMaxLosses;

      // Calculate exit profit as this level's net profit minus the max risk from all previous levels
      let levelExitProfit = netProfit - cumulativeMaxLosses;

      // For Level 2 in standard matrix, no previous levels, so exit profit is just net profit
      if (level === "Level 2" && matrixType === "standard") {
        levelExitProfit = netProfit;
      }

      // Add result to the array
      results.push({
        level,
        baseContracts: finalContractCount,
        premium: premiumForLevel,
        grossProfit,
        estimatedFees,
        netProfit,
        maxLossPerContract: spreadWidth * 100 - premiumForLevel * 100,
        maxLossThisLevel: potentialLossThisLevel, // Just this level's loss (max loss + fees)
        cumulativeMaxLosses, // Previous levels' max losses
        capitalRequired: potentialLossThisLevel,
        remainingCapital,
        levelExitProfit,
        closedEarly: false, // Default to not closed early
        closingPremium: 0,
        closingFees: 0,
        actualProfitLoss: netProfit,
        maxRisk, // Total max risk (this level + all previous levels)
      });

      // Update remaining capital and cumulative max losses for next level
      remainingCapital -= potentialLossThisLevel;

      // Only add to cumulative losses for non-final levels
      if (!isFinalLevel) {
        // Add current level's max loss to cumulative losses for next level's calculations
        cumulativeMaxLosses += potentialLossThisLevel;
        // Track contracts lost for all previous levels
        totalContractsLost += finalContractCount;
        // Track fees lost
        totalFeesLost += estimatedFees;
      }
    }

    return results;
  }; // End of calculateCompoundingResults function

  // Calculate the results
  const compoundingResults = calculateCompoundingResults();

  // Define styles for the UI components
  const cardStyle = {
    minHeight: "600px",
  };

  const sliderListStyle = {
    display: "flex" as const,
    flexDirection: "column" as const,
    width: "100%",
    gap: "8px",
    padding: "5px 0",
  };

  const sliderRowStyle = {
    display: "flex" as const,
    flexDirection: "column" as const,
    width: "100%",
    marginBottom: "5px",
  };

  const sliderContainerStyle = {
    display: "flex" as const,
    width: "100%",
    alignItems: "center",
    gap: "5px",
    minHeight: "22px",
  };

  const sliderStyle = {
    flex: "0 0 70%" as const,
    width: "70%",
  };

  const inputPrefixStyle = {
    display: "flex" as const,
    alignItems: "center",
    width: "100px",
    flexShrink: 0,
  };

  const labelStyle = {
    marginBottom: "2px",
    fontWeight: 500,
    fontSize: "0.9rem",
  };

  return (
    <div className="calculator-container">
      {/* Header */}
      <div className="header">
        <h1>Matrix Compounding Calculator</h1>
      </div>

      <div className="card fixed-height" style={cardStyle}>
        {/* Sliders Section - Each slider on its own line with fixed sizes */}
        <div
          className="compact-sliders-section"
          style={{ marginBottom: "10px" }}
        >
          <div style={sliderListStyle}>
            {/* Matrix Type Selection */}
            <div style={sliderRowStyle}>
              <label style={labelStyle}>Matrix Type</label>
              <div style={sliderContainerStyle}>
                <select
                  onChange={(e) => setMatrixType(e.target.value)}
                  value={matrixType}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: "#fff",
                    flex: "1 1 auto",
                    fontSize: "14px",
                  }}
                >
                  <option value="standard">Standard Matrix (Levels 2-5)</option>
                  <option value="stacked">Stacked Matrix (Levels 3-5)</option>
                  <option value="shifted">Shifted Matrix (Levels 3-6)</option>
                </select>
              </div>
            </div>

            {/* Buying Power Slider */}
            <div style={sliderRowStyle}>
              <label style={labelStyle}>
                Buying Power:{" "}
                <span style={{ fontSize: "0.85rem" }}>
                  ${buyingPower.toLocaleString()}
                </span>
              </label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={11800}
                  max={1000000}
                  step={5000}
                  value={buyingPower}
                  onChange={(e) => setBuyingPower(Number(e.target.value))}
                  className="slider"
                  style={sliderStyle}
                />
                <div style={inputPrefixStyle}>
                  <span className="input-prefix">$</span>
                  <NumericInput
                    value={buyingPower}
                    onChange={(value) => {
                      if (value !== "" && !isNaN(Number(value))) {
                        setBuyingPower(
                          Math.max(11800, Math.min(1000000, Number(value)))
                        );
                      }
                    }}
                    step="1000"
                    min={11800}
                    max={1000000}
                  />
                </div>
              </div>
            </div>
            {/* IC Premium Slider */}
            <div style={sliderRowStyle}>
              <label style={labelStyle}>
                IC Premium:{" "}
                <span style={{ fontSize: "0.85rem" }}>
                  ${expectedPremium.toFixed(2)}
                </span>
              </label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={1.6}
                  max={2.5}
                  step={0.05}
                  value={expectedPremium}
                  onChange={(e) => setExpectedPremium(Number(e.target.value))}
                  className="slider"
                  style={sliderStyle}
                />
                <div style={inputPrefixStyle}>
                  <span className="input-prefix">$</span>
                  <NumericInput
                    value={expectedPremium}
                    onChange={(value) => {
                      if (value !== "" && !isNaN(Number(value))) {
                        setExpectedPremium(
                          Math.max(1.6, Math.min(2.5, Number(value)))
                        );
                      }
                    }}
                    step="0.05"
                    min={1.6}
                    max={2.5}
                  />
                </div>
              </div>
            </div>
            {/* Fees per IC Slider */}
            <div style={sliderRowStyle}>
              <label style={labelStyle}>
                Fees per IC:{" "}
                <span style={{ fontSize: "0.85rem" }}>
                  ${commFees.toFixed(2)}
                </span>
              </label>
              <div style={sliderContainerStyle}>
                <input
                  type="range"
                  min={2.0}
                  max={10.0}
                  step={0.05}
                  value={commFees}
                  onChange={(e) => setCommFees(Number(e.target.value))}
                  className="slider"
                  style={sliderStyle}
                />
                <div style={inputPrefixStyle}>
                  <span className="input-prefix">$</span>
                  <NumericInput
                    value={commFees}
                    onChange={(value) => {
                      if (value !== "" && !isNaN(Number(value))) {
                        setCommFees(
                          Math.max(2.0, Math.min(10.0, Number(value)))
                        );
                      }
                    }}
                    step="0.05"
                    min={2.0}
                    max={10.0}
                  />
                </div>
              </div>
            </div>
            {/* Reset Button */}
            <button
              className="reset-button"
              style={{ marginTop: "5px" }}
              onClick={() => {
                setBuyingPower(26350);
                setExpectedPremium(1.75);
                setCommFees(6.56);
                // Reset all level premiums to default
                setLevelPremiums({
                  "Level 2": 1.75,
                  "Level 3": 1.75,
                  "Level 4": 1.75,
                  "Level 5": 1.65, // Keep Level 5 at 1.65 for profitability
                  "Level 6": 1.65, // Keep Level 6 at 1.65 for profitability
                  "Level 7": 1.65,
                });
                // Reset customized flags
                setLevelPremiumsCustomized({
                  "Level 2": false,
                  "Level 3": false,
                  "Level 4": false,
                  "Level 5": false,
                  "Level 6": false,
                  "Level 7": false,
                });
                // Reset level optimizations
                setLevelOptimizations({
                  "Level 2": { closedEarly: false, closingPremium: "" },
                  "Level 3": { closedEarly: false, closingPremium: "" },
                  "Level 4": { closedEarly: false, closingPremium: "" },
                  "Level 5": { closedEarly: false, closingPremium: "" },
                  "Level 6": { closedEarly: false, closingPremium: "" },
                  "Level 7": { closedEarly: false, closingPremium: "" },
                });
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Results Layout */}
        <div className="results-wrapper">
          {/* Contract Sizing per Level Section */}
          <div className="contract-sizing-section">
            <h3>Contract Sizing per Level</h3>
            <div className="contract-grid">
              {compoundingResults.map((result) => (
                <div key={result.level} className="contract-box">
                  <div className="contract-heading">{result.level}</div>
                  <div className="contract-value">{result.baseContracts}</div>
                </div>
              ))}
              <div className="contract-box total">
                <div className="contract-heading">Total</div>
                <div className="contract-value">
                  {compoundingResults.reduce(
                    (sum, result) => sum + result.baseContracts,
                    0
                  )}
                </div>
              </div>
            </div>
            <h3 style={{ marginTop: "20px" }}>IC Fees per Level</h3>
            <div className="contract-grid">
              {compoundingResults.map((result) => (
                <div
                  key={`fees-${result.level}`}
                  className="contract-box fees-box"
                >
                  <div className="contract-heading">{result.level}</div>
                  <div className="contract-value">
                    ${result.estimatedFees.toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="contract-box fees-box total">
                <div className="contract-heading">Total</div>
                <div className="contract-value">
                  $
                  {compoundingResults
                    .reduce((sum, result) => sum + result.estimatedFees, 0)
                    .toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Exit Profit & Max Risk Quick View */}
          <div className="metrics-quick-view">
            <h3>Level Exit Profit & Max Risk</h3>
            <div className="metrics-grid">
              {compoundingResults.map((result) => (
                <div key={result.level} className="metrics-column">
                  <div className="metrics-header">{result.level}</div>
                  <div className="metrics-item">
                    <div className="metrics-label">Exit Profit</div>
                    <div
                      className={`metrics-value ${
                        result.levelExitProfit >= 0 ? "profit" : "loss"
                      }`}
                    >
                      ${result.levelExitProfit.toFixed(2)}
                    </div>
                  </div>
                  <div className="metrics-item">
                    <div className="metrics-label">Max Risk</div>
                    <div className="metrics-value">
                      ${result.maxRisk.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message showing the capital and matrix details */}
        <div
          className="matrix-summary"
          style={{
            marginTop: "15px",
            textAlign: "center",
            fontSize: "1rem",
            fontWeight: "500",
          }}
        >
          Based on your ${buyingPower.toLocaleString()} capital, your{" "}
          {matrixType === "standard"
            ? "standard"
            : matrixType === "stacked"
            ? "stacked"
            : "shifted"}{" "}
          matrix is as above
          {matrixType === "shifted" && buyingPower < 11800 && (
            <div style={{ color: "#e74c3c", marginTop: "5px" }}>
              Note: At least $11,800 capital is needed for the shifted matrix
            </div>
          )}
          {/* Information text for shifted matrix */}
          {matrixType === "shifted" && (
            <div
              style={{ fontSize: "0.85rem", marginTop: "5px", color: "#555" }}
            >
              Shifted Matrix is sized for 6 Levels, where Level 2 quantity
              becomes Level 3
            </div>
          )}
          {/* Buffer information */}
          <div style={{ fontSize: "0.85rem", marginTop: "5px", color: "#555" }}>
            A 2% capital buffer (${(buyingPower * 0.02).toFixed(2)}) is reserved
            for safety
          </div>
          {/* Developer Credit */}
          <div
            style={{
              marginTop: "20px",
              fontSize: "0.8rem",
              color: "#666",
              fontStyle: "italic",
            }}
          >
            Dev by michael@insideoptions.io
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixCompounding;
