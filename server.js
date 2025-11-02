const express = require('express');
const axios = require('axios');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

let rolimonsCache = null;
let cacheTime = 0;

async function getRolimonsData() {
  const now = Date.now();
  
  if (rolimonsCache && (now - cacheTime) < 300000) {
    return rolimonsCache;
  }
  
  try {
    const response = await axios.get('https://www.rolimons.com/itemapi/itemdetails');
    rolimonsCache = response.data;
    cacheTime = now;
    console.log('Rolimons data refreshed');
    return rolimonsCache;
  } catch (error) {
    console.error('Error fetching Rolimons data:', error.message);
    return rolimonsCache || { items: {} };
  }
}

app.get('/inventory/:userId/:assetId', async (req, res) => {
  const { userId, assetId } = req.params;
  
  try {
    console.log(`Fetching inventory for user ${userId}, asset ${assetId}`);
    
    const response = await axios.get(
      `https://inventory.roblox.com/v1/users/${userId}/items/Asset/${assetId}?limit=100`
    );
    
    const count = response.data.data ? response.data.data.length : 0;
    
    res.json({
      success: true,
      userId: userId,
      assetId: assetId,
      count: count
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      count: 0
    });
  }
});

app.get('/hoarding/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Finding most hoarded item for user ${userId}`);
    
    const collectiblesResponse = await axios.get(
      `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100&sortOrder=Desc`
    );
    
    if (!collectiblesResponse.data.data || collectiblesResponse.data.data.length === 0) {
      return res.json({
        success: true,
        userId: userId,
        maxCount: 0,
        itemName: "No Items",
        displayName: "No Items",
        assetId: 0
      });
    }
    
    const itemCounts = {};
    const itemNames = {};
    
    for (const item of collectiblesResponse.data.data) {
      const assetId = item.assetId;
      const name = item.name;
      
      if (!itemCounts[assetId]) {
        itemCounts[assetId] = 0;
        itemNames[assetId] = name;
      }
      itemCounts[assetId]++;
    }
    
    let maxCount = 0;
    let maxAssetId = 0;
    
    for (const [assetId, count] of Object.entries(itemCounts)) {
      if (count > maxCount) {
        maxCount = count;
        maxAssetId = assetId;
      }
    }
    
    const itemName = itemNames[maxAssetId] || "Unknown";
    
    const rolimonsData = await getRolimonsData();
    let displayName = itemName;
    
    if (rolimonsData.items && rolimonsData.items[maxAssetId]) {
      const itemData = rolimonsData.items[maxAssetId];
      const acronym = itemData[1];
      
      if (acronym && acronym !== "" && typeof acronym === 'string') {
        displayName = acronym;
      } else {
        if (itemName.length > 18) {
          displayName = itemName.substring(0, 15) + "...";
        }
      }
    } else {
      if (itemName.length > 18) {
        displayName = itemName.substring(0, 15) + "...";
      }
    }
    
    res.json({
      success: true,
      userId: userId,
      maxCount: maxCount,
      itemName: itemName,
      displayName: displayName,
      assetId: maxAssetId
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      maxCount: 0,
      itemName: "Error",
      displayName: "Error",
      assetId: 0
    });
  }
});

// NEW ENDPOINT - Get all hoarded items
app.get('/hoarding-all/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    console.log(`Getting all hoarded items for user ${userId}`);
    
    const collectiblesResponse = await axios.get(
      `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=100&sortOrder=Desc`
    );
    
    if (!collectiblesResponse.data.data || collectiblesResponse.data.data.length === 0) {
      return res.json({
        success: true,
        userId: userId,
        items: []
      });
    }
    
    const itemCounts = {};
    const itemNames = {};
    
    for (const item of collectiblesResponse.data.data) {
      const assetId = item.assetId;
      const name = item.name;
      
      if (!itemCounts[assetId]) {
        itemCounts[assetId] = 0;
        itemNames[assetId] = name;
      }
      itemCounts[assetId]++;
    }
    
    const rolimonsData = await getRolimonsData();
    const itemList = [];
    
    for (const [assetId, count] of Object.entries(itemCounts)) {
      const itemName = itemNames[assetId];
      let displayName = itemName;
      
      if (rolimonsData.items && rolimonsData.items[assetId]) {
        const itemData = rolimonsData.items[assetId];
        const acronym = itemData[1];
        
        if (acronym && acronym !== "" && typeof acronym === 'string') {
          displayName = acronym;
        } else {
          if (itemName.length > 18) {
            displayName = itemName.substring(0, 15) + "...";
          }
        }
      } else {
        if (itemName.length > 18) {
          displayName = itemName.substring(0, 15) + "...";
        }
      }
      
      itemList.push({
        assetId: assetId,
        count: count,
        name: itemName,
        displayName: displayName
      });
    }
    
    // Sort by count (highest first)
    itemList.sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      userId: userId,
      items: itemList
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      items: []
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Inventory API with Rolimons Acronyms!',
    endpoints: {
      specific: 'GET /inventory/{userId}/{assetId}',
      hoarding: 'GET /hoarding/{userId}',
      hoardingAll: 'GET /hoarding-all/{userId}'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
