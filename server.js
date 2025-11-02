const express = require('express');
const axios = require('axios');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

// Helper function to get Rolimons item data (includes acronyms)
async function getRolimonsItemData(assetId) {
  try {
    const response = await axios.get('https://www.rolimons.com/itemapi/itemdetails');
    const data = response.data;
    
    if (data.items && data.items[assetId]) {
      return {
        acronym: data.items[assetId][3] || null, // Index 3 is acronym
        name: data.items[assetId][0] || null       // Index 0 is name
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Rolimons data:', error.message);
    return null;
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
        acronym: null,
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
    
    // Get acronym from Rolimons
    const rolimonsData = await getRolimonsItemData(maxAssetId);
    const acronym = rolimonsData ? rolimonsData.acronym : null;
    const itemName = itemNames[maxAssetId] || "Unknown";
    
    res.json({
      success: true,
      userId: userId,
      maxCount: maxCount,
      itemName: itemName,
      acronym: acronym,
      assetId: maxAssetId
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.json({
      success: false,
      error: error.message,
      maxCount: 0,
      itemName: "Error",
      acronym: null,
      assetId: 0
    });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Inventory API is running!',
    endpoints: {
      specific: 'GET /inventory/{userId}/{assetId}',
      hoarding: 'GET /hoarding/{userId}'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
