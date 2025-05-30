// src/api.ts
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
    strikes: {
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
  }
  
  const API_URL = 'https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod';
  
  export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
    try {
      const response = await fetch(`${API_URL}/trades?userEmail=${encodeURIComponent(userEmail)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  };
  
  export const createTrade = async (trade: Omit<Trade, 'id'>): Promise<Trade | null> => {
    try {
      const response = await fetch(`${API_URL}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trade),
      });
      if (!response.ok) {
        throw new Error('Failed to create trade');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating trade:', error);
      return null;
    }
  };
  
  export const updateTrade = async (trade: Trade): Promise<Trade | null> => {
    try {
      const response = await fetch(`${API_URL}/trades/${trade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trade),
      });
      if (!response.ok) {
        throw new Error('Failed to update trade');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating trade:', error);
      return null;
    }
  };
  
  export const deleteTrade = async (id: string, userEmail: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/trades/${id}?userEmail=${encodeURIComponent(userEmail)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting trade:', error);
      return false;
    }
  };