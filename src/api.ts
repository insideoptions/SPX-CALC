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
    const response = await fetch(
      `${API_URL}/trades?userEmail=${encodeURIComponent(userEmail)}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades`);
    console.log("API Request Body:", JSON.stringify(tradeWithId, null, 2));

    const response = await fetch(`${API_URL}/trades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(tradeWithId),
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Created trade response from AWS:", data);
    return data || tradeWithId; // Fall back to the local version if no data returned
  } catch (error) {
    console.error("Error creating trade in AWS:", error);
    return null;
  }
};

// Update an existing trade
export const updateTrade = async (trade: Trade): Promise<Trade | null> => {
  try {
    console.log("Updating trade in AWS:", trade);

    // Log the full request details for debugging
    console.log("API Request URL:", `${API_URL}/trades/${trade.id}`);
    console.log("API Request Body:", JSON.stringify(trade, null, 2));

    const response = await fetch(`${API_URL}/trades/${trade.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(trade),
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Updated trade response from AWS:", data);
    return data || trade; // Fall back to the local version if no data returned
  } catch (error) {
    console.error("Error updating trade in AWS:", error);
    return null;
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
      },
    });

    console.log("API Response Status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    console.log("Trade deleted successfully from AWS");
    return true;
  } catch (error) {
    console.error("Error deleting trade from AWS:", error);
    return false;
  }
};
