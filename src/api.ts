import { Trade } from './TradeLedger';

// Simple ID generator function
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// API URL
const API_URL = 'https://woitixbcei.execute-api.us-east-1.amazonaws.com/prod';

// Fetch all trades for a user
export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
  try {
    console.log('Fetching trades for user:', userEmail);
    const response = await fetch(`${API_URL}/trades?userEmail=${encodeURIComponent(userEmail)}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched trades:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
};

// Create a new trade
export const createTrade = async (trade: Omit<Trade, 'id'>): Promise<Trade | null> => {
  try {
    console.log('Creating trade:', trade);
    const tradeWithId = {
      ...trade,
      id: generateId()
    };
    
    const response = await fetch(`${API_URL}/trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradeWithId),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Created trade:', data);
    return data;
  } catch (error) {
    console.error('Error creating trade:', error);
    return null;
  }
};

// Update an existing trade
export const updateTrade = async (trade: Trade): Promise<Trade | null> => {
  try {
    console.log('Updating trade:', trade);
    const response = await fetch(`${API_URL}/trades/${trade.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trade),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Updated trade:', data);
    return data;
  } catch (error) {
    console.error('Error updating trade:', error);
    return null;
  }
};

// Delete a trade
export const deleteTrade = async (tradeId: string): Promise<boolean> => {
  try {
    console.log('Deleting trade:', tradeId);
    const response = await fetch(`${API_URL}/trades/${tradeId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    console.log('Trade deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting trade:', error);
    return false;
  }
};
