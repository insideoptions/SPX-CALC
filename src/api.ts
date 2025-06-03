// Robust API functions for SPX-CALC
// Ensures userEmail is always sent and matches backend Lambda expectations

import { Trade } from "./TradeLedger";

  id: string;
  userEmail: string;
  [key: string]: any;
}

const API_URL = "https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod";

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

export const createTrade = async (trade: Omit<Trade, "id">, userEmail: string): Promise<Trade> => {
  const response = await fetch(`${API_URL}/trades`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...trade, userEmail }),
    mode: "cors",
  });
  if (!response.ok) throw new Error("Failed to create trade");
  return await response.json();
};


export const updateTrade = async (tradeId: string, trade: Partial<Trade>, userEmail: string): Promise<Trade> => {
  const response = await fetch(`${API_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(userEmail)}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ...trade, userEmail }),
    mode: "cors",
  });
  if (!response.ok) throw new Error("Failed to update trade");
  return await response.json();
};

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

export const deleteTrade = async (tradeId: string, userEmail: string): Promise<boolean> => {
  const response = await fetch(`${API_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(userEmail)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/json"
    },
    mode: "cors",
  });
  if (response.status !== 204) throw new Error("Failed to delete trade");
  return true;
};

  try {
    console.log("Deleting trade from AWS:", tradeId);

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades/${tradeId}`);

    const response = await fetch(`${API_URL}/trades/${tradeId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-user-email": userEmail,
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
