import { Trade } from "./TradeLedger";

// Simple ID generator function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const API_URL = "https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod";

// Fetch all trades for a user
export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
  try {
    const cacheBuster = `${Date.now()}_${Math.random()
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
        mode: "cors",
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
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
    const tradeWithId = {
      ...trade,
      id: generateId(),
    };

    const response = await fetch(`${API_URL}/trades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      body: JSON.stringify(tradeWithId),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error creating trade:", error);
    return null;
  }
};

// Update an existing trade
export const updateTrade = async (
  trade: Trade,
  userEmail: string
): Promise<Trade | null> => {
  try {
    // Send tradeId in both path and query string for robustness
    const response = await fetch(
      `${API_URL}/trades/${encodeURIComponent(
        trade.id
      )}?userEmail=${encodeURIComponent(userEmail)}&id=${encodeURIComponent(
        trade.id
      )}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-user-email": userEmail,
        },
        mode: "cors",
        body: JSON.stringify(trade),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating trade:", error);
    return null;
  }
};

// Delete a trade
export const deleteTrade = async (
  tradeId: string,
  userEmail: string
): Promise<boolean> => {
  try {
    // Send tradeId in both path and query string for robustness
    const response = await fetch(
      `${API_URL}/trades/${encodeURIComponent(
        tradeId
      )}?userEmail=${encodeURIComponent(userEmail)}&id=${encodeURIComponent(
        tradeId
      )}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-user-email": userEmail,
        },
        mode: "cors",
      }
    );
    if (response.status === 204) return true;
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    return true;
  } catch (error) {
    console.error("Error deleting trade:", error);
    return false;
  }
};
