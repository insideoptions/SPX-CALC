import { Trade } from "./TradeLedger";

const API_URL = "https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod";

// Fetch all trades for a user
export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
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
      mode: "cors",
    }
  );
  if (!response.ok) throw new Error("Failed to fetch trades");
  const data = await response.json();
  return data.items || [];
};

// Create a new trade
export const createTrade = async (
  trade: Omit<Trade, "id">,
  userEmail: string
): Promise<Trade> => {
  const response = await fetch(`${API_URL}/trades`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...trade, userEmail }),
    mode: "cors",
  });
  if (!response.ok) throw new Error("Failed to create trade");
  return await response.json();
};

// Update an existing trade
export const updateTrade = async (
  tradeId: string,
  trade: Partial<Trade>,
  userEmail: string
): Promise<Trade> => {
  const response = await fetch(
    `${API_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(userEmail)}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...trade, userEmail }),
      mode: "cors",
    }
  );
  if (!response.ok) throw new Error("Failed to update trade");
  return await response.json();
};

// Delete a trade
export const deleteTrade = async (
  tradeId: string,
  userEmail: string
): Promise<boolean> => {
  const response = await fetch(
    `${API_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(userEmail)}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
      mode: "cors",
    }
  );
  if (response.status !== 204) throw new Error("Failed to delete trade");
  return true;
};
