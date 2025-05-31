import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "./GoogleAuthContext";
import TradeForm from "./TradeForm";
import { fetchTrades, createTrade, updateTrade, deleteTrade } from "./api";
import "./TradeLedger.css";

// Define interfaces for auth context and user
interface User {
  email: string | null;
  id?: string; // Support for old code using id
  uid?: string; // Support for new code using uid
}

// Trade interface
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
  spxClosePrice?: number; // Added SPX close price
  isMaxProfit?: boolean; // Flag to indicate if trade achieved max profit
  seriesId?: string; // Identifier for grouping trades in the same series
}

// Props for the component
interface TradeLedgerProps {
  onTradeUpdate?: (trades: Trade[]) => void;
}

// Helper function to assign series IDs to trades based on common attributes
const assignSeriesToTrades = (trades: Trade[]): Trade[] => {
  if (!trades || trades.length === 0) {
    return [];
  }
  
  // Create a copy of trades to avoid mutating the original
  const tradesWithSeries = [...trades];
  
  // Group trades by their common attributes
  const tradeGroups: { [key: string]: Trade[] } = {};
  
  tradesWithSeries.forEach(trade => {
    // Create a unique key based on trade attributes that define a series
    const seriesKey = `${trade.tradeType}_${trade.level}_${trade.strikes.sellPut}_${trade.strikes.buyPut}_${trade.strikes.sellCall}_${trade.strikes.buyCall}`;
    
    if (!tradeGroups[seriesKey]) {
      tradeGroups[seriesKey] = [];
    }
    
    tradeGroups[seriesKey].push(trade);
  });
  
  // Assign series IDs to trades in each group
  Object.entries(tradeGroups).forEach(([seriesKey, groupTrades]) => {
    // Only create a series if there are multiple trades with the same attributes
    if (groupTrades.length > 1) {
      // Use the earliest trade date as the basis for the series ID
      const sortedByDate = [...groupTrades].sort((a, b) => 
        new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
      );
      
      const seriesId = `series_${sortedByDate[0].id}`;
      
      // Assign the series ID to all trades in this group
      groupTrades.forEach(trade => {
        const tradeIndex = tradesWithSeries.findIndex(t => t.id === trade.id);
        if (tradeIndex >= 0) {
          tradesWithSeries[tradeIndex] = {
            ...tradesWithSeries[tradeIndex],
            seriesId
          };
        }
      });
    }
  });
  
  return tradesWithSeries;
};

// Main component
const TradeLedger: React.FC<TradeLedgerProps> = ({ onTradeUpdate }) => {
  // Get user from auth context
  const { user } = useAuth();
  
  // State for trades and UI
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddTrade, setShowAddTrade] = useState<boolean>(false);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [showSpxDialog, setShowSpxDialog] = useState<boolean>(false);
  const [spxClosePrice, setSpxClosePrice] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [groupBySeries, setGroupBySeries] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Ref to track if sync is in progress to prevent multiple syncs
  const syncInProgressRef = useRef<boolean>(false);

  // Sync local trades with AWS
  const syncLocalTradesWithAWS = async () => {
    if (!user?.email || syncInProgressRef.current) {
      console.log('Sync already in progress or no user email, skipping sync');
      return;
    }
    
    syncInProgressRef.current = true;
    console.log('Starting sync of local trades with AWS...');
    
    try {
      // Get trades from local storage
      const localStorageKey = `trades_${user.email}`;
      const storedData = localStorage.getItem(localStorageKey);
      
      if (!storedData) {
        console.log('No local trades found to sync');
        syncInProgressRef.current = false;
        return;
      }
      
      const localTrades: Trade[] = JSON.parse(storedData);
      
      // Find local-only trades (those with IDs starting with "local_" or containing "_modified")
      const localOnlyTrades = localTrades.filter(trade => 
        trade.id.startsWith('local_') || trade.id.includes('_modified')
      );
      
      if (localOnlyTrades.length === 0) {
        console.log('No local-only trades found to sync');
        syncInProgressRef.current = false;
        return;
      }
      
      console.log(`Found ${localOnlyTrades.length} local trades to sync with AWS`);
      
      // Sync each local trade to AWS with retry logic
      for (const localTrade of localOnlyTrades) {
        let awsSuccess = false;
        let currentRetry = 0;
        const maxRetries = 3;
        
        while (currentRetry < maxRetries && !awsSuccess) {
          try {
            console.log(`Syncing trade ${localTrade.id} to AWS (attempt ${currentRetry + 1}/${maxRetries})...`);
            
            let awsTrade: Trade | null = null;
            
            if (localTrade.id.startsWith('local_')) {
              // This is a new trade that needs to be created in AWS
              awsTrade = await createTrade({
                ...localTrade,
                userEmail: user.email,
                userId: user.id || user.uid || ''
              });
            } else if (localTrade.id.includes('_modified')) {
              // This is a modified trade that needs to be updated in AWS
              const originalId = localTrade.id.split('_modified')[0];
              awsTrade = await updateTrade({
                ...localTrade,
                id: originalId, // Use the original ID for the update
                userEmail: user.email,
                userId: user.id || user.uid || ''
              });
            }
            
            if (awsTrade) {
              console.log(`Successfully synced trade ${localTrade.id} to AWS`);
              
              // Update the local trade with the AWS version
              const updatedLocalTrades = localTrades.map(trade => 
                trade.id === localTrade.id ? awsTrade! : trade
              );
              
              // Update local storage and state
              localStorage.setItem(localStorageKey, JSON.stringify(updatedLocalTrades));
              
              const updatedTradesWithSeries = assignSeriesToTrades(updatedLocalTrades);
              setTrades(updatedTradesWithSeries);
              
              if (onTradeUpdate) {
                onTradeUpdate(updatedTradesWithSeries);
              }
              
              awsSuccess = true;
            }
          } catch (error) {
            console.error(`Error syncing trade to AWS (attempt ${currentRetry + 1}/${maxRetries}):`, error);
            // Exponential backoff for retries
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetry) * 1000));
          }
          
          currentRetry++;
        }
        
        if (!awsSuccess) {
          console.error(`Failed to sync trade ${localTrade.id} after ${maxRetries} attempts`);
        }
      }
      
      console.log('Completed sync of local trades with AWS');
      setLastSyncTime(new Date());
      
    } catch (error) {
      console.error('Error in syncLocalTradesWithAWS:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  };

  // Load trades with robust handling of local and AWS data
  const loadTrades = async () => {
    if (!user?.email) {
      console.error('Cannot load trades: No user email');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    console.log('Loading trades for user:', user.email);
    
    try {
      // First load from local storage for immediate display
      const localStorageKey = `trades_${user.email}`;
      const storedData = localStorage.getItem(localStorageKey);
      let localTrades: Trade[] = [];
      
      if (storedData) {
        try {
          localTrades = JSON.parse(storedData);
          console.log('Loaded trades from local storage:', localTrades.length);
          
          // Update state with local trades immediately for fast UI response
          const tradesWithSeries = assignSeriesToTrades(localTrades);
          setTrades(tradesWithSeries);
          if (onTradeUpdate) {
            onTradeUpdate(tradesWithSeries);
          }
        } catch (error) {
          console.error('Error parsing local trades:', error);
        }
      }
      
      // Then fetch from AWS with cache busting
      console.log('Fetching trades from AWS...');
      const awsTrades = await fetchTrades(user.email);
      console.log('Fetched trades from AWS:', awsTrades.length);
      
      // Merge AWS trades with local trades, preferring AWS versions
      const mergedTrades = [...localTrades];
      let hasChanges = false;
      
      // Update with AWS trades
      if (awsTrades && awsTrades.length > 0) {
        awsTrades.forEach(awsTrade => {
          const localIndex = mergedTrades.findIndex(t => t.id === awsTrade.id);
          
          if (localIndex >= 0) {
            // Trade exists locally, check if it's different
            if (JSON.stringify(mergedTrades[localIndex]) !== JSON.stringify(awsTrade)) {
              mergedTrades[localIndex] = awsTrade;
              hasChanges = true;
            }
          } else {
            // New trade from AWS, add it
            mergedTrades.push(awsTrade);
            hasChanges = true;
          }
        });
      }
      
      // Check for local trades that need to be synced to AWS
      const localOnlyTrades = mergedTrades.filter(trade => 
        trade.id.startsWith('local_') || trade.id.includes('_modified')
      );
      
      if (localOnlyTrades.length > 0) {
        console.log('Found', localOnlyTrades.length, 'local trades that need to be synced to AWS');
        // Trigger background sync
        setTimeout(() => {
          syncLocalTradesWithAWS();
        }, 1000);
      }
      
      // Update local storage and state if there were changes
      if (hasChanges) {
        console.log('Updating local storage with merged trades');
        localStorage.setItem(localStorageKey, JSON.stringify(mergedTrades));
        
        const tradesWithSeries = assignSeriesToTrades(mergedTrades);
        setTrades(tradesWithSeries);
        if (onTradeUpdate) {
          onTradeUpdate(tradesWithSeries);
        }
      }
      
      // Do a secondary fetch after a delay to ensure we have the latest data
      setTimeout(async () => {
        try {
          const latestAwsTrades = await fetchTrades(user.email!);
          if (latestAwsTrades && latestAwsTrades.length > 0) {
            const currentTrades = [...mergedTrades];
            let secondaryChanges = false;
            
            latestAwsTrades.forEach(awsTrade => {
              const index = currentTrades.findIndex(t => t.id === awsTrade.id);
              if (index >= 0) {
                // Check if different
                if (JSON.stringify(currentTrades[index]) !== JSON.stringify(awsTrade)) {
                  currentTrades[index] = awsTrade;
                  secondaryChanges = true;
                }
              } else {
                // New trade
                currentTrades.push(awsTrade);
                secondaryChanges = true;
              }
            });
            
            if (secondaryChanges) {
              console.log('Secondary fetch found changes, updating...');
              localStorage.setItem(localStorageKey, JSON.stringify(currentTrades));
              
              const updatedTradesWithSeries = assignSeriesToTrades(currentTrades);
              setTrades(updatedTradesWithSeries);
              if (onTradeUpdate) {
                onTradeUpdate(updatedTradesWithSeries);
              }
            }
          }
        } catch (error) {
          console.error('Error in secondary fetch:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error loading trades:', error);
      
      // Try local storage as fallback if API fails
      if (user?.email) {
        const storedTrades = localStorage.getItem(`trades_${user.email}`);
        if (storedTrades) {
          try {
            const parsedTrades = JSON.parse(storedTrades);
            console.log('API failed, using local storage as fallback:', parsedTrades.length);
            const tradesWithSeries = assignSeriesToTrades(parsedTrades);
            setTrades(tradesWithSeries);
            if (onTradeUpdate) {
              onTradeUpdate(tradesWithSeries);
            }
          } catch (parseError) {
            console.error('Error parsing stored trades:', parseError);
          }
        }
      }
    } finally {
      setLoading(false);
      setLastSyncTime(new Date());
    }
  };

  // Set up periodic background sync
  useEffect(() => {
    // Don't run if no user is logged in
    if (!user?.email) return;
    
    console.log('Setting up periodic background sync...');
    
    // Initial sync after a short delay
    const initialSyncTimeout = setTimeout(() => {
      syncLocalTradesWithAWS();
    }, 5000);
    
    // Set up interval for periodic sync (every 2 minutes)
    const syncInterval = setInterval(() => {
      console.log('Running periodic background sync...');
      if (!syncInProgressRef.current && user?.email) {
        loadTrades();
        
        // After loading trades, sync any local changes to AWS
        setTimeout(() => {
          syncLocalTradesWithAWS();
        }, 1000);
      }
    }, 120000); // 2 minutes
    
    // Clean up on unmount
    return () => {
      clearTimeout(initialSyncTimeout);
      clearInterval(syncInterval);
    };
  }, [user]);

  // Fetch trades on component mount
  useEffect(() => {
    if (user?.email) {
      console.log('User logged in or changed, loading trades and syncing...');
      loadTrades();
    }
  }, [user]);
  
  // Save trades to local storage whenever they change
  useEffect(() => {
    if (user?.email && trades.length > 0) {
      console.log('Saving trades to local storage:', trades.length);
      localStorage.setItem(`trades_${user.email}`, JSON.stringify(trades));
    }
  }, [trades, user?.email]);

  // Add a new trade with proper AWS sync and local storage update
  const addTrade = async (newTrade: Trade) => {
    if (!user?.email) {
      console.error('Cannot add trade: No user email');
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate a local ID for immediate UI update
      const localId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const tradeWithLocalId: Trade = {
        ...newTrade,
        id: localId,
        userEmail: user.email,
        userId: user.id || user.uid || ''
      };
      
      // Update local state immediately for responsive UI
      const updatedTrades = [...trades, tradeWithLocalId];
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);
      
      // Update local storage
      if (user.email) {
        localStorage.setItem(`trades_${user.email}`, JSON.stringify(updatedTradesWithSeries));
      }
      
      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }
      
      // Try to sync to AWS with retry logic
      let awsSuccess = false;
      let currentRetry = 0;
      const maxRetries = 3;
      let awsTrade: Trade | null = null;
      
      while (currentRetry < maxRetries && !awsSuccess) {
        try {
          console.log(`Creating trade in AWS (attempt ${currentRetry + 1}/${maxRetries})...`);
          
          awsTrade = await createTrade({
            ...newTrade,
            userEmail: user.email,
            userId: user.id || user.uid || ''
          });
          
          if (awsTrade) {
            console.log('Successfully created trade in AWS:', awsTrade.id);
            awsSuccess = true;
          }
        } catch (error) {
          console.error(`Error creating trade in AWS (attempt ${currentRetry + 1}/${maxRetries}):`, error);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetry) * 1000));
        }
        
        currentRetry++;
      }
      
      // If AWS sync was successful, update the local trade with the AWS version
      if (awsSuccess && awsTrade) {
        const finalUpdatedTrades = updatedTrades.map(trade => 
          trade.id === localId ? awsTrade! : trade
        );
        
        const finalTradesWithSeries = assignSeriesToTrades(finalUpdatedTrades);
        setTrades(finalTradesWithSeries);
        
        // Update local storage
        if (user.email) {
          localStorage.setItem(`trades_${user.email}`, JSON.stringify(finalTradesWithSeries));
        }
        
        // Notify parent if callback exists
        if (onTradeUpdate) {
          onTradeUpdate(finalTradesWithSeries);
        }
      }
      
    } catch (error) {
      console.error('Error adding trade:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update an existing trade with proper AWS sync
  const updateTradeHandler = async (updatedTrade: Trade) => {
    if (!user?.email) {
      console.error('Cannot update trade: No user email');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create a modified version with a special ID to track local changes
      const modifiedId = `${updatedTrade.id}_modified`;
      const tradeWithModifiedId: Trade = {
        ...updatedTrade,
        id: modifiedId
      };
      
      // Update local state immediately
      const updatedTrades = trades.map(trade => 
        trade.id === updatedTrade.id ? tradeWithModifiedId : trade
      );
      
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);
      
      // Update local storage
      if (user.email) {
        localStorage.setItem(`trades_${user.email}`, JSON.stringify(updatedTradesWithSeries));
      }
      
      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }
      
      // Try to sync to AWS with retry logic
      let awsSuccess = false;
      let currentRetry = 0;
      const maxRetries = 3;
      let awsTrade: Trade | null = null;
      
      while (currentRetry < maxRetries && !awsSuccess) {
        try {
          console.log(`Updating trade in AWS (attempt ${currentRetry + 1}/${maxRetries})...`);
          
          awsTrade = await updateTrade({
            ...updatedTrade,
            userEmail: user.email,
            userId: user.id || user.uid || ''
          });
          
          if (awsTrade) {
            console.log('Successfully updated trade in AWS:', awsTrade.id);
            awsSuccess = true;
          }
        } catch (error) {
          console.error(`Error updating trade in AWS (attempt ${currentRetry + 1}/${maxRetries}):`, error);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetry) * 1000));
        }
        
        currentRetry++;
      }
      
      // If AWS sync was successful, update the local trade with the AWS version
      if (awsSuccess && awsTrade) {
        const finalUpdatedTrades = updatedTrades.map(trade => 
          trade.id === modifiedId ? awsTrade! : trade
        );
        
        const finalTradesWithSeries = assignSeriesToTrades(finalUpdatedTrades);
        setTrades(finalTradesWithSeries);
        
        // Update local storage
        if (user.email) {
          localStorage.setItem(`trades_${user.email}`, JSON.stringify(finalTradesWithSeries));
        }
        
        // Notify parent if callback exists
        if (onTradeUpdate) {
          onTradeUpdate(finalTradesWithSeries);
        }
      }
      
    } catch (error) {
      console.error('Error updating trade:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete a trade with proper AWS sync
  const deleteTradeHandler = async (tradeId: string) => {
    if (!user?.email) {
      console.error('Cannot delete trade: No user email');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find the trade to delete
      const tradeToDelete = trades.find(trade => trade.id === tradeId);
      if (!tradeToDelete) {
        console.error('Trade not found for deletion:', tradeId);
        setLoading(false);
        return;
      }
      
      // Remove from local state immediately
      const updatedTrades = trades.filter(trade => trade.id !== tradeId);
      const updatedTradesWithSeries = assignSeriesToTrades(updatedTrades);
      setTrades(updatedTradesWithSeries);
      
      // Update local storage
      if (user.email) {
        localStorage.setItem(`trades_${user.email}`, JSON.stringify(updatedTradesWithSeries));
      }
      
      // Notify parent if callback exists
      if (onTradeUpdate) {
        onTradeUpdate(updatedTradesWithSeries);
      }
      
      // Only try to delete from AWS if it's not a local-only trade
      if (!tradeId.startsWith('local_')) {
        // Try to sync deletion to AWS with retry logic
        let awsSuccess = false;
        let currentRetry = 0;
        const maxRetries = 3;
        
        while (currentRetry < maxRetries && !awsSuccess) {
          try {
            console.log(`Deleting trade from AWS (attempt ${currentRetry + 1}/${maxRetries})...`);
            
            await deleteTrade(tradeId);
            console.log('Successfully deleted trade from AWS:', tradeId);
            awsSuccess = true;
          } catch (error) {
            console.error(`Error deleting trade from AWS (attempt ${currentRetry + 1}/${maxRetries}):`, error);
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, currentRetry) * 1000));
          }
          
          currentRetry++;
        }
        
        if (!awsSuccess) {
          console.error(`Failed to delete trade ${tradeId} from AWS after ${maxRetries} attempts`);
        }
      }
      
    } catch (error) {
      console.error('Error deleting trade:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close a trade by updating its status and exit details
  const closeTradeHandler = async (tradeId: string, exitPrice: number, exitDate: string, spxClosePrice?: number) => {
    if (!user?.email) {
      console.error('Cannot close trade: No user email');
      return;
    }
    
    try {
      // Find the trade to close
      const tradeToClose = trades.find(trade => trade.id === tradeId);
      if (!tradeToClose) {
        console.error('Trade not found for closing:', tradeId);
        return;
      }
      
      // Calculate P&L
      const entryPremium = tradeToClose.entryPremium;
      const contractQuantity = tradeToClose.contractQuantity;
      const fees = tradeToClose.fees || 0;
      
      let pnl = ((exitPrice - entryPremium) * 100 * contractQuantity) - fees;
      
      // Check if this is a max profit scenario
      let isMaxProfit = false;
      if (tradeToClose.tradeType === "IRON_CONDOR") {
        // For iron condor, max profit is achieved when both spreads expire worthless
        isMaxProfit = exitPrice <= 0.05; // Assuming near-zero premium indicates max profit
      } else if (tradeToClose.tradeType === "PUT_SPREAD") {
        // For put spread, max profit is when spread expires worthless (above strikes)
        isMaxProfit = exitPrice <= 0.05;
      } else if (tradeToClose.tradeType === "CALL_SPREAD") {
        // For call spread, max profit is when spread expires worthless (below strikes)
        isMaxProfit = exitPrice <= 0.05;
      }
      
      // Create updated trade object
      const updatedTrade: Trade = {
        ...tradeToClose,
        status: "CLOSED",
        exitDate,
        exitPremium: exitPrice,
        pnl,
        isMaxProfit,
        spxClosePrice
      };
      
      // Use the update handler to sync with AWS
      await updateTradeHandler(updatedTrade);
      
    } catch (error) {
      console.error('Error closing trade:', error);
    }
  };

  // Handle adding a new trade
  const handleAddTrade = () => {
    setShowAddTrade(true);
  };

  // Handle editing a trade
  const handleEditTrade = (trade: Trade) => {
    setTradeToEdit(trade);
  };

  // Handle closing a trade
  const handleCloseTrade = (trade: Trade) => {
    setTradeToClose(trade);
    setShowSpxDialog(true);
  };

  // Handle submitting SPX close price when closing a trade
  const handleSpxSubmit = () => {
    if (tradeToClose) {
      const spxPrice = spxClosePrice ? parseFloat(spxClosePrice) : undefined;
      closeTradeHandler(tradeToClose.id, tradeToClose.entryPremium, new Date().toISOString(), spxPrice);
      setShowSpxDialog(false);
      setTradeToClose(null);
      setSpxClosePrice("");
    }
  };

  // Filter trades based on status
  const filteredTrades = trades.filter(trade => {
    if (filterStatus === "ALL") return true;
    return trade.status === filterStatus;
  });

  // Group trades by series if enabled
  const displayTrades = groupBySeries
    ? filteredTrades.reduce((acc: { [key: string]: Trade[] }, trade) => {
        const key = trade.seriesId || trade.id;
        if (!acc[key]) acc[key] = [];
        acc[key].push(trade);
        return acc;
      }, {})
    : { individual: filteredTrades };

  // Render the component
  return (
    <div className="trade-ledger">
      <div className="trade-ledger-header">
        <h2>Trade Ledger</h2>
        <div className="trade-actions">
          <button onClick={handleAddTrade} className="add-trade-btn">
            Add Trade
          </button>
          <div className="filter-controls">
            <label>
              Filter by Status:
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="ALL">All Trades</option>
                <option value="OPEN">Open Trades</option>
                <option value="CLOSED">Closed Trades</option>
                <option value="EXPIRED">Expired Trades</option>
              </select>
            </label>
            <label className="group-checkbox">
              Group by Series:
              <input
                type="checkbox"
                checked={groupBySeries}
                onChange={() => setGroupBySeries(!groupBySeries)}
              />
            </label>
          </div>
        </div>
        {lastSyncTime && (
          <div className="last-sync">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading trades...</div>
      ) : (
        <div className="trades-container">
          {Object.entries(displayTrades).map(([key, groupTrades]) => {
            // Skip empty groups
            if (!Array.isArray(groupTrades) || groupTrades.length === 0) return null;
            
            // For individual display or single-trade series
            if (key === 'individual' || groupTrades.length === 1) {
              return groupTrades.map((trade) => (
                <div key={trade.id} className={`trade-card ${trade.status.toLowerCase()}`}>
                  <div className="trade-header">
                    <h3>{trade.tradeType.replace('_', ' ')} - {trade.level}</h3>
                    <div className="trade-status">{trade.status}</div>
                  </div>
                  <div className="trade-details">
                    <div className="trade-dates">
                      <div>Trade Date: {new Date(trade.tradeDate).toLocaleDateString()}</div>
                      <div>Entry: {new Date(trade.entryDate).toLocaleDateString()}</div>
                      {trade.exitDate && (
                        <div>Exit: {new Date(trade.exitDate).toLocaleDateString()}</div>
                      )}
                    </div>
                    <div className="trade-strikes">
                      <div>Sell Put: {trade.strikes.sellPut}</div>
                      <div>Buy Put: {trade.strikes.buyPut}</div>
                      <div>Sell Call: {trade.strikes.sellCall}</div>
                      <div>Buy Call: {trade.strikes.buyCall}</div>
                    </div>
                    <div className="trade-financials">
                      <div>Contracts: {trade.contractQuantity}</div>
                      <div>Entry: ${trade.entryPremium.toFixed(2)}</div>
                      {trade.exitPremium !== undefined && (
                        <div>Exit: ${trade.exitPremium.toFixed(2)}</div>
                      )}
                      {trade.pnl !== undefined && (
                        <div className={`pnl ${trade.pnl >= 0 ? 'profit' : 'loss'}`}>
                          P&L: ${trade.pnl.toFixed(2)}
                          {trade.isMaxProfit && <span className="max-profit">MAX</span>}
                        </div>
                      )}
                    </div>
                    {trade.spxClosePrice && (
                      <div className="spx-close">
                        SPX Close: {trade.spxClosePrice}
                      </div>
                    )}
                    {trade.notes && <div className="trade-notes">{trade.notes}</div>}
                  </div>
                  <div className="trade-actions">
                    <button onClick={() => handleEditTrade(trade)}>
                      Edit
                    </button>
                    {trade.status === "OPEN" && (
                      <button onClick={() => handleCloseTrade(trade)}>
                        Close
                      </button>
                    )}
                    <button onClick={() => deleteTradeHandler(trade.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ));
            }
            
            // For multi-trade series
            const firstTrade = groupTrades[0];
            return (
              <div key={key} className="trade-series">
                <div className="series-header">
                  <h3>{firstTrade.tradeType.replace('_', ' ')} Series - {firstTrade.level}</h3>
                  <div className="series-strikes">
                    {firstTrade.strikes.sellPut}/{firstTrade.strikes.buyPut} - 
                    {firstTrade.strikes.sellCall}/{firstTrade.strikes.buyCall}
                  </div>
                </div>
                <div className="series-trades">
                  {groupTrades.map((trade) => (
                    <div key={trade.id} className={`series-trade ${trade.status.toLowerCase()}`}>
                      <div className="trade-header">
                        <div>Trade Date: {new Date(trade.tradeDate).toLocaleDateString()}</div>
                        <div className="trade-status">{trade.status}</div>
                      </div>
                      <div className="trade-details">
                        <div className="trade-dates">
                          <div>Entry: {new Date(trade.entryDate).toLocaleDateString()}</div>
                          {trade.exitDate && (
                            <div>Exit: {new Date(trade.exitDate).toLocaleDateString()}</div>
                          )}
                        </div>
                        <div className="trade-financials">
                          <div>Contracts: {trade.contractQuantity}</div>
                          <div>Entry: ${trade.entryPremium.toFixed(2)}</div>
                          {trade.exitPremium !== undefined && (
                            <div>Exit: ${trade.exitPremium.toFixed(2)}</div>
                          )}
                          {trade.pnl !== undefined && (
                            <div className={`pnl ${trade.pnl >= 0 ? 'profit' : 'loss'}`}>
                              P&L: ${trade.pnl.toFixed(2)}
                              {trade.isMaxProfit && <span className="max-profit">MAX</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="trade-actions">
                        <button onClick={() => handleEditTrade(trade)}>
                          Edit
                        </button>
                        {trade.status === "OPEN" && (
                          <button onClick={() => handleCloseTrade(trade)}>
                            Close
                          </button>
                        )}
                        <button onClick={() => deleteTradeHandler(trade.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowAddTrade(false)}>&times;</span>
            <h2>Add New Trade</h2>
            <TradeForm
              onSubmit={(trade) => {
                addTrade(trade);
                setShowAddTrade(false);
              }}
              onCancel={() => setShowAddTrade(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {tradeToEdit && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setTradeToEdit(null)}>&times;</span>
            <h2>Edit Trade</h2>
            <TradeForm
              trade={tradeToEdit}
              onSubmit={(trade) => {
                updateTradeHandler(trade);
                setTradeToEdit(null);
              }}
              onCancel={() => setTradeToEdit(null)}
            />
          </div>
        </div>
      )}

      {/* SPX Close Price Dialog */}
      {showSpxDialog && tradeToClose && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => {
              setShowSpxDialog(false);
              setTradeToClose(null);
            }}>&times;</span>
            <h2>Enter SPX Close Price</h2>
            <div className="spx-form">
              <label>
                SPX Close Price (optional):
                <input
                  type="number"
                  value={spxClosePrice}
                  onChange={(e) => setSpxClosePrice(e.target.value)}
                  placeholder="Enter SPX close price"
                />
              </label>
              <button onClick={handleSpxSubmit}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradeLedger;


