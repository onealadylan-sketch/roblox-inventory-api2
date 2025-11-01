const express = require('express');
const axios = require('axios');
const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

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

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Roblox Inventory API is running!',
    usage: 'GET /inventory/{userId}/{assetId}'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
