// Trade interface - defined here to avoid circular imports
export interface Trade {
  id: string;
  userId: string;
  userEmail: string;
  tradeDate: string;
  entryDate: string;
  exitDate?: string;
  level: string;
  contractQuantity: number;
  entryPremium: number;
  exitPremium?: number;
  tradeType: "IRON_CONDOR" | "PUT_SPREAD" | "CALL_SPREAD";
  sellPut?: number; // Added for TradeForm compatibility
  buyPut?: number; // Added for TradeForm compatibility
  sellCall?: number; // Added for TradeForm compatibility
  buyCall?: number; // Added for TradeForm compatibility
  strikes: {
    // Kept for now to minimize breaking changes elsewhere
    sellPut: number;
    buyPut: number;
    sellCall: number;
    buyCall: number;
  };
  status: "OPEN" | "CLOSED" | "EXPIRED";
  pnl?: number;
  fees: number;
  notes?: string;
  isAutoPopulated: boolean;
  matrix: string;
  buyingPower: string;
  spxClosePrice?: number;
  isMaxProfit?: boolean;
  seriesId?: string;
}

const API_BASE_URL =
  "https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod";

export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
  try {
    console.log("=== FETCH TRADES DEBUG ===");
    console.log("Fetching trades for user:", userEmail);

    const fetchUrl = `${API_BASE_URL}/trades?userEmail=${encodeURIComponent(
      userEmail
    )}`;
    console.log("Fetch URL:", fetchUrl);

    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response status:", response.status);
    console.log("Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch API Error Response:", errorText);
      throw new Error(
        `Failed to fetch trades: ${response.status} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Fetched trades successfully:", data);

    return data.items || [];
  } catch (error) {
    console.error("Error fetching trades:", error);
    throw error;
  }
};

export const createTrade = async (trade: Omit<Trade, "id">): Promise<Trade> => {
  try {
    console.log("=== CREATE TRADE DEBUG ===");
    console.log("Creating trade:", trade);

    const createUrl = `${API_BASE_URL}/trades?userEmail=${encodeURIComponent(
      trade.userEmail
    )}`;
    console.log("Create URL:", createUrl);

    const response = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": trade.userEmail,
      },
      body: JSON.stringify(trade),
    });

    console.log("Create response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create API Error Response:", errorText);
      throw new Error(
        `Failed to create trade: ${response.status} - ${errorText}`
      );
    }

    const savedTrade = await response.json();
    console.log("Trade created successfully:", savedTrade);

    return savedTrade;
  } catch (error) {
    console.error("Error creating trade:", error);
    throw error;
  }
};

export const updateTrade = async (trade: Trade): Promise<Trade> => {
  try {
    console.log("=== UPDATE TRADE DEBUG ===\n");
    console.log("Updating trade:", trade);
    console.log("LEVEL BEING SENT TO API:", trade.level);
    console.log("TRADE TYPE:", typeof trade);
    console.log("TRADE JSON:", JSON.stringify(trade));

    // SPECIAL HANDLING: Extract the level value before sending to ensure it's preserved
    const levelValue = trade.level;
    console.log("EXTRACTED LEVEL VALUE:", levelValue);

    // Create a clean copy of the trade with the level explicitly set
    const tradeCopy = {
      ...trade,
      level: levelValue || "Level 2", // Default to Level 2 if empty
    };

    console.log("MODIFIED TRADE FOR API:", tradeCopy);
    console.log("MODIFIED TRADE JSON:", JSON.stringify(tradeCopy));

    const updateUrl = `${API_BASE_URL}/trades/${
      trade.id
    }?userEmail=${encodeURIComponent(trade.userEmail)}`;
    console.log("Update URL:", updateUrl);

    const response = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": trade.userEmail,
      },
      // Use the modified trade object with fixed level value
      body: JSON.stringify(tradeCopy),
    });

    console.log("Update response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update API Error Response:", errorText);
      throw new Error(
        `Failed to update trade: ${response.status} - ${errorText}`
      );
    }

    const updatedTrade = await response.json();
    console.log("Trade updated successfully:", updatedTrade);
    console.log("LEVEL RETURNED FROM API:", updatedTrade.level);
    console.log("UPDATED TRADE JSON:", JSON.stringify(updatedTrade));

    return updatedTrade;
  } catch (error) {
    console.error("Error updating trade:", error);
    throw error;
  }
};

export const deleteTrade = async (
  tradeId: string,
  userEmail: string
): Promise<boolean> => {
  try {
    console.log("=== DELETE TRADE DEBUG ===");
    console.log("Deleting trade ID:", tradeId);
    console.log("For user:", userEmail);

    const deleteUrl = `${API_BASE_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(
      userEmail
    )}`;
    console.log("Delete URL:", deleteUrl);

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
    });

    console.log("Delete response status:", response.status);
    console.log("Delete response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Delete API Error Response:", errorText);
      throw new Error(
        `Failed to delete trade: ${response.status} - ${errorText}`
      );
    }

    console.log("Trade deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting trade:", error);
    throw error;
  }
};
