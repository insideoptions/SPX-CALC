import React, { useState, useEffect } from "react";
import "./SpxMatrixUser.css";

// Define separate types for different matrix structures
interface BaseMatrixRow {
  buyingPower: string;
  level1: string | number;
  level2: string | number;
  level3: number;
  level4: number;
  level5: number;
}

interface ShiftedMatrixRow extends BaseMatrixRow {
  level6: number;
}

type MatrixRow = BaseMatrixRow | ShiftedMatrixRow;

interface MatrixData {
  headerInfo: {
    title: string;
    liveAlertTime: string;
    manualChannel: string;
    tosChannel: string;
    instructions: string;
    note: string;
  };
  matrices: {
    [key: string]: {
      title: string;
      subtitle: string;
      description?: string;
      data: MatrixRow[];
    };
  };
}

const SpxMatrixUser: React.FC = () => {
  // This would typically come from your backend/API
  const [matrixData, setMatrixData] = useState<MatrixData>({
    headerInfo: {
      title: "OFFICIAL SPX PROGRAM MATRIX",
      liveAlertTime:
        "Live Alerts will post around 4:00pm EST as the cutoff time is 4:15pm EST on getting filled",
      manualChannel: "#spx-trade-alert channel for manual entry",
      tosChannel:
        "#thinkorswim-alerts-13kbp channel for copy & paste for TOS desktop only",
      instructions:
        "INSTRUCTIONS FOR ALL MATRIX:\n1. Select your Buying Power (BP) - Money you put in for this program\n2. Trade the number of Quantity in the corresponding row for each level based on trade alert",
      note: "Note: If you are trading the $11,800 or $16,300 Buying Power Matrix you will skip/no trade level 2 alert\n- Starts trading after 1 Outside day\n- Light Blue - Stay on this Matrix once started",
    },
    matrices: {
      level2Start: {
        title: "LEVEL 2 START MATRIX (Standard Matrix)",
        subtitle:
          "Starts trading after 1 Outside Day\nExpect to trade 6-9 times/month",
        data: [
          {
            buyingPower: "$11,800",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 2,
            level4: 8,
            level5: 24,
          },
          {
            buyingPower: "$16,300",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 3,
            level4: 11,
            level5: 33,
          },
          {
            buyingPower: "$21,900",
            level1: "Skip / No Trade",
            level2: 1,
            level3: 4,
            level4: 14,
            level5: 44,
          },
          {
            buyingPower: "$26,350",
            level1: "Skip / No Trade",
            level2: 1,
            level3: 5,
            level4: 17,
            level5: 53,
          },
          {
            buyingPower: "$30,850",
            level1: "Skip / No Trade",
            level2: 1,
            level3: 6,
            level4: 20,
            level5: 62,
          },
          {
            buyingPower: "$33,300",
            level1: "Skip / No Trade",
            level2: 2,
            level3: 6,
            level4: 21,
            level5: 67,
          },
          {
            buyingPower: "$36,400",
            level1: "Skip / No Trade",
            level2: 2,
            level3: 7,
            level4: 23,
            level5: 73,
          },
        ],
      },
      stacked: {
        title: "STACKED MATRIX",
        subtitle:
          "Starts trading after 2 Consecutive Outside Day\nLevel 2 Quantity was added to Level 3",
        description:
          "(Only if instructed by David) This will potentially increase our profit by (Skip/No trade Level 2) trade alert pass and waiting for (Level 3) alert the next day. If a level 3 alert occurs, we can combine the trade sizes from both levels for a potentially bigger win. This approach avoids any potential losses from level 2 trade since we never placed it.",
        data: [
          {
            buyingPower: "$11,800",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 2,
            level4: 8,
            level5: 24,
          },
          {
            buyingPower: "$16,300",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 3,
            level4: 11,
            level5: 33,
          },
          {
            buyingPower: "$21,900",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 5,
            level4: 14,
            level5: 44,
          },
          {
            buyingPower: "$26,350",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 6,
            level4: 17,
            level5: 53,
          },
          {
            buyingPower: "$30,850",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 7,
            level4: 20,
            level5: 62,
          },
          {
            buyingPower: "$33,300",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 8,
            level4: 21,
            level5: 67,
          },
          {
            buyingPower: "$36,400",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 9,
            level4: 23,
            level5: 73,
          },
        ],
      },
      shifted: {
        title: "SHIFTED MATRIX",
        subtitle:
          "Starts trading after 2 Consecutive Outside Day\nThis Matrix is Sized for 6 Levels, our level 2 quantity becomes level 3 and so forth",
        description:
          "(Only if instructed by David) This matrix is designed using 6 Levels, allowing us to use the same buying power by adding a level and shifting each level over.",
        data: [
          {
            buyingPower: "$11,800",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 2,
            level4: 8,
            level5: 24,
            level6: 24,
          },
          {
            buyingPower: "$16,300",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 3,
            level4: 11,
            level5: 33,
            level6: 33,
          },
          {
            buyingPower: "$21,900",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 1,
            level4: 4,
            level5: 14,
            level6: 44,
          },
          {
            buyingPower: "$26,350",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 1,
            level4: 5,
            level5: 17,
            level6: 53,
          },
          {
            buyingPower: "$30,850",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 1,
            level4: 6,
            level5: 20,
            level6: 62,
          },
          {
            buyingPower: "$33,300",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 2,
            level4: 6,
            level5: 21,
            level6: 67,
          },
          {
            buyingPower: "$36,400",
            level1: "Skip / No Trade",
            level2: "Skip / No Trade",
            level3: 2,
            level4: 7,
            level5: 23,
            level6: 73,
          },
        ],
      },
    },
  });

  const [selectedMatrix, setSelectedMatrix] = useState("level2Start");
  const [selectedBuyingPower, setSelectedBuyingPower] = useState<string | null>(
    null
  );

  const getBuyingPowerOptions = () => {
    return matrixData.matrices[selectedMatrix].data.map(
      (row) => row.buyingPower
    );
  };

  const MatrixSelector = () => (
    <div className="card">
      <h3 className="section-title">Select Your Trading Matrix</h3>
      <div className="matrix-selector-grid">
        {Object.entries(matrixData.matrices).map(([key, matrix]) => (
          <button
            key={key}
            onClick={() => setSelectedMatrix(key)}
            className={`matrix-selector-button ${
              selectedMatrix === key ? "active" : ""
            }`}
          >
            <h4 className="matrix-selector-title">{matrix.title}</h4>
            <p className="matrix-selector-subtitle">{matrix.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const BuyingPowerSelector = () => (
    <div className="card">
      <h3 className="section-title">Select Your Buying Power</h3>
      <div className="buying-power-grid">
        {getBuyingPowerOptions().map((bp) => (
          <button
            key={bp}
            onClick={() => setSelectedBuyingPower(bp)}
            className={`buying-power-button ${
              selectedBuyingPower === bp ? "active" : ""
            }`}
          >
            {bp}
          </button>
        ))}
      </div>
    </div>
  );

  const TradingPanel = () => {
    if (!selectedBuyingPower) {
      return (
        <div className="card">
          <div className="trading-panel-empty">
            <div className="trading-panel-icon">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>
              </svg>
            </div>
            <h4>Select Your Buying Power</h4>
            <p>
              Please click on one of the buying power amounts above to view your
              specific trading quantities for each level.
            </p>
          </div>
        </div>
      );
    }

    const currentRow = matrixData.matrices[selectedMatrix].data.find(
      (row) => row.buyingPower === selectedBuyingPower
    );

    if (!currentRow) return null;

    return (
      <div className="card">
        <h3 className="section-title">
          Your Trading Quantities - {selectedBuyingPower}
        </h3>

        <div className="trading-quantities-grid">
          {[1, 2, 3, 4, 5].map((level) => {
            const quantity =
              currentRow[`level${level}` as keyof typeof currentRow];
            const isSkip = quantity === "Skip / No Trade";

            return (
              <div
                key={level}
                className={`quantity-card ${
                  isSkip ? "skip-card" : "trade-card"
                }`}
              >
                <div className="quantity-level">LEVEL {level}</div>
                <div
                  className={`quantity-value ${
                    isSkip ? "skip-value" : "trade-value"
                  }`}
                >
                  {isSkip ? "SKIP" : quantity}
                </div>
                {!isSkip && <div className="quantity-label">contracts</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const InstructionsPanel = () => (
    <div className="card">
      <h3 className="section-title">Instructions & Channels</h3>

      <div className="instructions-grid">
        <div className="instruction-card warning">
          <h4 className="instruction-title">Trading Instructions</h4>
          <p className="instruction-text">
            {matrixData.headerInfo.instructions}
          </p>
        </div>

        <div className="instruction-card info">
          <h4 className="instruction-title">Important Notes</h4>
          <p className="instruction-text">{matrixData.headerInfo.note}</p>
        </div>

        <div className="channels-grid">
          <div className="channel-card manual">
            <h4 className="channel-title">Manual Entry</h4>
            <p className="channel-text">
              {matrixData.headerInfo.manualChannel}
            </p>
          </div>

          <div className="channel-card tos">
            <h4 className="channel-title">ThinkorSwim Alerts</h4>
            <p className="channel-text">{matrixData.headerInfo.tosChannel}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const MatrixDisplayTable = () => {
    const currentMatrix = matrixData.matrices[selectedMatrix];
    const hasLevel6 = selectedMatrix === "shifted";

    return (
      <div className="card">
        <h3 className="section-title">{currentMatrix.title}</h3>
        <p className="matrix-description">{currentMatrix.subtitle}</p>
        {currentMatrix.description && (
          <p className="matrix-description description-text">
            {currentMatrix.description}
          </p>
        )}

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>BUYING POWER</th>
                <th>LEVEL 1</th>
                <th>LEVEL 2</th>
                <th>LEVEL 3</th>
                <th>LEVEL 4</th>
                <th>LEVEL 5</th>
                {hasLevel6 && <th>LEVEL 6</th>}
              </tr>
            </thead>
            <tbody>
              {currentMatrix.data.map((row, index) => (
                <tr
                  key={index}
                  className={
                    row.buyingPower === selectedBuyingPower
                      ? "selected-row"
                      : ""
                  }
                >
                  <td className="buying-power-cell">{row.buyingPower}</td>
                  {/* Generate levels 1-5 for all matrices */}
                  {[1, 2, 3, 4, 5].map((level) => {
                    const quantity = row[`level${level}` as keyof typeof row];
                    const isSkip = quantity === "Skip / No Trade";

                    return (
                      <td
                        key={level}
                        className={`quantity-cell ${
                          isSkip ? "skip-cell" : "trade-cell"
                        }`}
                      >
                        {isSkip ? "Skip / No Trade" : quantity}
                      </td>
                    );
                  })}
                  {/* Render level6 if it's the shifted matrix */}
                  {hasLevel6 && (
                    <td className="quantity-cell trade-cell">
                      {(row as ShiftedMatrixRow).level6}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="calculator-container">
      {/* Header */}
      <div className="header">
        <h1>{matrixData.headerInfo.title}</h1>
        <div className="header-date">
          Updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Matrix Selection */}
      <MatrixSelector />

      {/* Buying Power Selection */}
      <BuyingPowerSelector />

      {/* Trading Panel */}
      <TradingPanel />

      {/* Instructions */}
      <InstructionsPanel />

      {/* Matrix Display */}
      <MatrixDisplayTable />
    </div>
  );
};

export default SpxMatrixUser;
