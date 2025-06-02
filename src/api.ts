import { Trade } from "./TradeLedger";

// Simple ID generator function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// API URL
const API_URL = "https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod";

// Fetch all trades for a user
export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
  try {
    console.log("Fetching trades for user:", userEmail);

    // Add a stronger cache-busting parameter to prevent browser caching
    const cacheBuster = `${new Date().getTime()}_${Math.random()
      .toString(36)
      .substring(2)}`;
    const response = await fetch(
      `${API_URL}/trades?userEmail=${encodeURIComponent(
        userEmail
      )}&_cb=${cacheBuster}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        mode: "cors", // Explicitly set CORS mode
      }
    );

    console.log("Fetch response status:", response.status);
    console.log(
      "Fetch response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch API error response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Fetched trades:", data);
    return data.items || [];
  } catch (error) {
    console.error("Error fetching trades:", error);
    return [];
  }
};

// Create a new trade
export const createTrade = async (
  trade: Omit<Trade, "id">
): Promise<Trade | null> => {
  try {
    console.log("Creating trade with AWS:", trade);

    // Generate a client-side ID to ensure we have one
    const tradeWithId = {
      ...trade,
      id: generateId(),
    };

    // Ensure all required fields are present and properly formatted
    const formattedTrade = {
      ...tradeWithId,
      // Ensure numeric fields are numbers
      contractQuantity: Number(tradeWithId.contractQuantity) || 1,
      entryPremium: Number(tradeWithId.entryPremium) || 0,
      exitPremium: tradeWithId.exitPremium
        ? Number(tradeWithId.exitPremium)
        : undefined,
      fees: Number(tradeWithId.fees) || 0,
      pnl: tradeWithId.pnl ? Number(tradeWithId.pnl) : undefined,
      spxClosePrice: tradeWithId.spxClosePrice
        ? Number(tradeWithId.spxClosePrice)
        : undefined,

      // Ensure strikes are properly formatted
      strikes: {
        sellPut: Number(tradeWithId.strikes?.sellPut) || 0,
        buyPut: Number(tradeWithId.strikes?.buyPut) || 0,
        sellCall: Number(tradeWithId.strikes?.sellCall) || 0,
        buyCall: Number(tradeWithId.strikes?.buyCall) || 0,
      },

      // Ensure dates are in ISO format
      tradeDate:
        tradeWithId.tradeDate || new Date().toISOString().split("T")[0],
      entryDate: tradeWithId.entryDate || new Date().toISOString(),
      exitDate: tradeWithId.exitDate || undefined,

      // Ensure required string fields
      userId: tradeWithId.userId || "",
      userEmail: tradeWithId.userEmail || "",
      level: tradeWithId.level || "Level 2",
      tradeType: tradeWithId.tradeType || "IRON_CONDOR",
      status: tradeWithId.status || "OPEN",
      matrix: tradeWithId.matrix || "standard",
      buyingPower: tradeWithId.buyingPower || "$26,350",

      // Ensure boolean fields
      isAutoPopulated: Boolean(tradeWithId.isAutoPopulated),
      isMaxProfit:
        tradeWithId.isMaxProfit !== undefined
          ? Boolean(tradeWithId.isMaxProfit)
          : undefined,

      // Optional fields
      notes: tradeWithId.notes || "",
      seriesId: tradeWithId.seriesId || undefined,
    };

    // Remove undefined fields to clean up the payload
    Object.keys(formattedTrade).forEach((key) => {
      if (formattedTrade[key as keyof typeof formattedTrade] === undefined) {
        delete formattedTrade[key as keyof typeof formattedTrade];
      }
    });

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades`);
    console.log("API Request Body:", JSON.stringify(formattedTrade, null, 2));

    const response = await fetch(`${API_URL}/trades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors", // Explicitly set CORS mode
      body: JSON.stringify(formattedTrade),
    });

    console.log("API Response Status:", response.status);
    console.log(
      "API Response Headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);

      // More specific error handling
      if (response.status === 403) {
        throw new Error("Access forbidden. Please check your authentication.");
      } else if (response.status === 400) {
        throw new Error(`Invalid data: ${errorText}`);
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("Created trade response from AWS:", data);
    return data || formattedTrade; // Fall back to the local version if no data returned
  } catch (error) {
    console.error("Error creating trade in AWS:", error);

    // Re-throw with more specific error message
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Unknown error occurred while creating trade");
    }
  }
};

// Update an existing trade
export const updateTrade = async (trade: Trade): Promise<Trade | null> => {
  try {
    console.log("Updating trade in AWS:", trade);

    // Ensure all fields are properly formatted (same as create)
    const formattedTrade = {
      ...trade,
      // Ensure numeric fields are numbers
      contractQuantity: Number(trade.contractQuantity) || 1,
      entryPremium: Number(trade.entryPremium) || 0,
      exitPremium: trade.exitPremium ? Number(trade.exitPremium) : undefined,
      fees: Number(trade.fees) || 0,
      pnl: trade.pnl ? Number(trade.pnl) : undefined,
      spxClosePrice: trade.spxClosePrice
        ? Number(trade.spxClosePrice)
        : undefined,

      // Ensure strikes are properly formatted
      strikes: {
        sellPut: Number(trade.strikes?.sellPut) || 0,
        buyPut: Number(trade.strikes?.buyPut) || 0,
        sellCall: Number(trade.strikes?.sellCall) || 0,
        buyCall: Number(trade.strikes?.buyCall) || 0,
      },
    };

    // Remove undefined fields
    Object.keys(formattedTrade).forEach((key) => {
      if (formattedTrade[key as keyof typeof formattedTrade] === undefined) {
        delete formattedTrade[key as keyof typeof formattedTrade];
      }
    });

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades/${trade.id}`);
    console.log("API Request Body:", JSON.stringify(formattedTrade, null, 2));

    const response = await fetch(`${API_URL}/trades/${trade.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors", // Explicitly set CORS mode
      body: JSON.stringify(formattedTrade),
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);

      // More specific error handling
      if (response.status === 403) {
        throw new Error("Access forbidden. Please check your authentication.");
      } else if (response.status === 400) {
        throw new Error(`Invalid data: ${errorText}`);
      } else if (response.status === 404) {
        throw new Error("Trade not found.");
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("Updated trade response from AWS:", data);
    return data || formattedTrade; // Fall back to the local version if no data returned
  } catch (error) {
    console.error("Error updating trade in AWS:", error);

    // Re-throw with more specific error message
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Unknown error occurred while updating trade");
    }
  }
};

// Delete a trade
export const deleteTrade = async (tradeId: string): Promise<boolean> => {
  try {
    console.log("Deleting trade from AWS:", tradeId);

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades/${tradeId}`);

    const response = await fetch(`${API_URL}/trades/${tradeId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors", // Explicitly set CORS mode
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);

      // More specific error handling
      if (response.status === 403) {
        throw new Error("Access forbidden. Please check your authentication.");
      } else if (response.status === 404) {
        throw new Error("Trade not found.");
      } else if (response.status === 500) {
        throw new Error("Server error. Please try again later.");
      } else {
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
    }

    console.log("Trade deleted successfully from AWS");
    return true;
  } catch (error) {
    console.error("Error deleting trade from AWS:", error);

    // Re-throw with more specific error message
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Unknown error occurred while deleting trade");
    }
  }
};
