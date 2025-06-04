import { Trade } from './TradeLedger';

const API_BASE_URL = 'https://wo1t1xbcei.execute-api.us-east-1.amazonaws.com/prod';

// Fetch all trades for a user
export const fetchTrades = async (userEmail: string): Promise<Trade[]> => {
  try {
    console.log('Fetching trades for user:', userEmail);
    
    const response = await fetch(`${API_BASE_URL}/trades?userEmail=${encodeURIComponent(userEmail)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fetch API Error Response:', errorText);
      throw new Error(`Failed to fetch trades: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Fetched trades successfully:', data);
    
    return data.items || [];
  } catch (error) {
    console.error('Error fetching trades:', error);
    throw error;
  }
};

// Create a new trade
export const createTrade = async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
  try {
    console.log('Creating trade:', trade);
    
    const response = await fetch(`${API_BASE_URL}/trades?userEmail=${encodeURIComponent(trade.userEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': trade.userEmail, // Additional header for redundancy
      },
      body: JSON.stringify(trade),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create API Error Response:', errorText);
      throw new Error(`Failed to create trade: ${response.status} - ${errorText}`);
    }

    const savedTrade = await response.json();
    console.log('Trade created successfully:', savedTrade);
    
    return savedTrade;
  } catch (error) {
    console.error('Error creating trade:', error);
    throw error;
  }
};

// Update an existing trade
export const updateTrade = async (trade: Trade): Promise<Trade> => {
  try {
    console.log('Updating trade:', trade);
    
    const response = await fetch(`${API_BASE_URL}/trades/${trade.id}?userEmail=${encodeURIComponent(trade.userEmail)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': trade.userEmail, // Additional header for redundancy
      },
      body: JSON.stringify(trade),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update API Error Response:', errorText);
      throw new Error(`Failed to update trade: ${response.status} - ${errorText}`);
    }

    const updatedTrade = await response.json();
    console.log('Trade updated successfully:', updatedTrade);
    
    return updatedTrade;
  } catch (error) {
    console.error('Error updating trade:', error);
    throw error;
  }
};

// Delete a trade - THIS IS THE MAIN FIX
export const deleteTrade = async (tradeId: string, userEmail: string): Promise<boolean> => {
  try {
    console.log('Deleting trade from AWS:', tradeId);
    
    // FIXED: Now includes userEmail as query parameter like your other API calls
    const deleteUrl = `${API_BASE_URL}/trades/${tradeId}?userEmail=${encodeURIComponent(userEmail)}`;
    console.log('Delete URL:', deleteUrl);
    
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail, // Additional header for redundancy
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete API Error Response:', errorText);
      throw new Error(`Failed to delete trade: ${response.status} - ${errorText}`);
    }

    console.log('Trade deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting trade:', error);
    throw error;
  }
};