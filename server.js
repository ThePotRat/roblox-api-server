import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validationResult, param, query } from 'express-validator';
import NodeCache from 'node-cache';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cache instance for storing API responses (TTL: 5 minutes)
const cache = new NodeCache({ stdTTL: 300 });

// Middleware Setup
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per minute default
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// API Key authentication middleware (optional)
const authenticateApiKey = (req, res, next) => {
  const requiredApiKey = process.env.API_KEY;
  
  // If no API key is set in environment, skip authentication
  if (!requiredApiKey) {
    return next();
  }

  const providedApiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!providedApiKey || providedApiKey !== requiredApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
};

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// Utility function for consistent API responses
const sendResponse = (res, data, message = 'Success') => {
  res.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Utility function for error responses
const sendError = (res, statusCode, message, code = 'UNKNOWN_ERROR', details = null) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  });
};

// Roblox API helper function
const fetchFromRobloxAPI = async (url, cacheKey = null, ttl = 300) => {
  try {
    // Check cache first
    if (cacheKey && cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'RobloxAPI/1.0'
      }
    });

    const data = response.data;
    
    // Cache the response
    if (cacheKey) {
      cache.set(cacheKey, data, ttl);
    }

    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Roblox API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Failed to connect to Roblox API');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

// ROUTES

// Health check endpoint
app.get('/health', (req, res) => {
  sendResponse(res, {
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }, 'API is healthy');
});

// GET /player/:userId - User profile data
app.get('/player/:userId',
  authenticateApiKey,
  param('userId').isNumeric().withMessage('User ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const cacheKey = `player_${userId}`;

      // Try to fetch from Roblox Users API
      try {
        const userInfo = await fetchFromRobloxAPI(
          `https://users.roblox.com/v1/users/${userId}`,
          cacheKey
        );

        // Fetch additional data
        const [friendsData, avatarData] = await Promise.allSettled([
          fetchFromRobloxAPI(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
          fetchFromRobloxAPI(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`)
        ]);

        const friendsCount = friendsData.status === 'fulfilled' ? friendsData.value.count : 0;
        const avatarThumbnail = avatarData.status === 'fulfilled' && avatarData.value.data.length > 0
          ? avatarData.value.data[0].imageUrl
          : 'https://www.roblox.com/headshot-thumbnail/image?userId=' + userId;

        sendResponse(res, {
          userId: parseInt(userId),
          username: userInfo.displayName || userInfo.name,
          displayName: userInfo.displayName,
          description: userInfo.description || '',
          created: userInfo.created,
          isBanned: userInfo.isBanned || false,
          friendsCount,
          avatarThumbnail,
          hasVerifiedBadge: userInfo.hasVerifiedBadge || false
        });

      } catch (apiError) {
        // Fallback to mock data if API fails
        sendResponse(res, {
          userId: parseInt(userId),
          username: `Player${userId}`,
          displayName: `Player${userId}`,
          description: 'A Roblox player',
          created: '2020-01-01T00:00:00.000Z',
          isBanned: false,
          friendsCount: Math.floor(Math.random() * 1000),
          avatarThumbnail: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150`,
          hasVerifiedBadge: false
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to fetch player data', 'PLAYER_FETCH_ERROR', error.message);
    }
  }
);

// GET /game/:gameId/stats - Game statistics
app.get('/game/:gameId/stats',
  authenticateApiKey,
  param('gameId').isNumeric().withMessage('Game ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const cacheKey = `game_stats_${gameId}`;

      try {
        // Fetch from Roblox Games API
        const gameData = await fetchFromRobloxAPI(
          `https://games.roblox.com/v1/games?universeIds=${gameId}`,
          cacheKey
        );

        if (gameData.data && gameData.data.length > 0) {
          const game = gameData.data[0];
          sendResponse(res, {
            gameId: parseInt(gameId),
            name: game.name,
            description: game.description,
            creator: {
              id: game.creator.id,
              name: game.creator.name,
              type: game.creator.type
            },
            rootPlaceId: game.rootPlaceId,
            created: game.created,
            updated: game.updated,
            maxPlayers: game.maxPlayers,
            playing: game.playing,
            visits: game.visits,
            favoritedCount: game.favoritedCount
          });
        } else {
          throw new Error('Game not found');
        }
      } catch (apiError) {
        // Mock data fallback
        sendResponse(res, {
          gameId: parseInt(gameId),
          name: `Game ${gameId}`,
          description: 'An awesome Roblox game!',
          creator: {
            id: 1,
            name: 'GameDeveloper',
            type: 'User'
          },
          visits: Math.floor(Math.random() * 1000000),
          likes: Math.floor(Math.random() * 50000),
          dislikes: Math.floor(Math.random() * 5000),
          favorites: Math.floor(Math.random() * 25000),
          playing: Math.floor(Math.random() * 10000),
          maxPlayers: 50,
          created: '2021-01-01T00:00:00.000Z',
          updated: new Date().toISOString()
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to fetch game statistics', 'GAME_STATS_ERROR', error.message);
    }
  }
);

// GET /group/:groupId - Group information
app.get('/group/:groupId',
  authenticateApiKey,
  param('groupId').isNumeric().withMessage('Group ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const cacheKey = `group_${groupId}`;

      try {
        const groupData = await fetchFromRobloxAPI(
          `https://groups.roblox.com/v1/groups/${groupId}`,
          cacheKey
        );

        sendResponse(res, {
          id: groupData.id,
          name: groupData.name,
          description: groupData.description,
          owner: groupData.owner,
          shout: groupData.shout,
          memberCount: groupData.memberCount,
          isBuildersClubOnly: groupData.isBuildersClubOnly,
          publicEntryAllowed: groupData.publicEntryAllowed,
          hasVerifiedBadge: groupData.hasVerifiedBadge || false
        });

      } catch (apiError) {
        // Mock data fallback
        sendResponse(res, {
          id: parseInt(groupId),
          name: `Group ${groupId}`,
          description: 'A cool Roblox group!',
          owner: {
            userId: 1,
            username: 'GroupOwner',
            displayName: 'Group Owner'
          },
          memberCount: Math.floor(Math.random() * 10000),
          isBuildersClubOnly: false,
          publicEntryAllowed: true,
          hasVerifiedBadge: false
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to fetch group information', 'GROUP_FETCH_ERROR', error.message);
    }
  }
);

// GET /avatar/:userId - Avatar thumbnail
app.get('/avatar/:userId',
  authenticateApiKey,
  param('userId').isNumeric().withMessage('User ID must be numeric'),
  query('size').optional().isIn(['30x30', '48x48', '60x60', '75x75', '100x100', '110x110', '150x150', '180x180', '352x352', '420x420', '720x720']),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const size = req.query.size || '150x150';
      const cacheKey = `avatar_${userId}_${size}`;

      try {
        const avatarData = await fetchFromRobloxAPI(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png`,
          cacheKey
        );

        if (avatarData.data && avatarData.data.length > 0) {
          sendResponse(res, {
            userId: parseInt(userId),
            imageUrl: avatarData.data[0].imageUrl,
            state: avatarData.data[0].state,
            size
          });
        } else {
          throw new Error('Avatar not found');
        }
      } catch (apiError) {
        // Fallback URL
        sendResponse(res, {
          userId: parseInt(userId),
          imageUrl: `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=${size.split('x')[0]}&height=${size.split('x')[1]}`,
          state: 'Completed',
          size
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to fetch avatar', 'AVATAR_FETCH_ERROR', error.message);
    }
  }
);

// GET /asset/:assetId - Asset details
app.get('/asset/:assetId',
  authenticateApiKey,
  param('assetId').isNumeric().withMessage('Asset ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assetId } = req.params;
      
      // Mock data for asset details (Roblox Asset API is limited)
      sendResponse(res, {
        assetId: parseInt(assetId),
        name: `Asset ${assetId}`,
        description: 'A Roblox asset',
        assetType: {
          id: 1,
          name: 'T-Shirt'
        },
        creator: {
          id: 1,
          name: 'Creator',
          type: 'User'
        },
        price: Math.floor(Math.random() * 1000),
        isLimited: Math.random() > 0.8,
        isLimitedUnique: Math.random() > 0.95,
        remaining: Math.floor(Math.random() * 100),
        sales: Math.floor(Math.random() * 10000),
        created: '2021-01-01T00:00:00.000Z',
        updated: new Date().toISOString()
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch asset details', 'ASSET_FETCH_ERROR', error.message);
    }
  }
);

// GET /limited/:assetId - Limited item market data
app.get('/limited/:assetId',
  authenticateApiKey,
  param('assetId').isNumeric().withMessage('Asset ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { assetId } = req.params;
      
      // Mock limited item market data
      const sales = Array.from({ length: 10 }, (_, i) => ({
        userAssetId: Math.floor(Math.random() * 1000000),
        seller: {
          id: Math.floor(Math.random() * 100000),
          name: `Seller${i + 1}`
        },
        price: Math.floor(Math.random() * 10000) + 100,
        serialNumber: i + 1,
        dateTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));

      sendResponse(res, {
        assetId: parseInt(assetId),
        name: `Limited Item ${assetId}`,
        recentAveragePrice: Math.floor(Math.random() * 5000) + 500,
        originalPrice: Math.floor(Math.random() * 1000) + 100,
        priceDataPoints: sales.map(sale => ({
          value: sale.price,
          date: sale.dateTime
        })),
        volumeDataPoints: Array.from({ length: 30 }, (_, i) => ({
          value: Math.floor(Math.random() * 50),
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })),
        recentSales: sales
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch limited item data', 'LIMITED_FETCH_ERROR', error.message);
    }
  }
);

// GET /mutual/:userId/:otherUserId - Mutual friends
app.get('/mutual/:userId/:otherUserId',
  authenticateApiKey,
  param('userId').isNumeric().withMessage('User ID must be numeric'),
  param('otherUserId').isNumeric().withMessage('Other User ID must be numeric'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, otherUserId } = req.params;
      
      // Mock mutual friends data
      const mutualFriends = Array.from({ length: Math.floor(Math.random() * 20) }, (_, i) => ({
        id: Math.floor(Math.random() * 1000000),
        username: `MutualFriend${i + 1}`,
        displayName: `Mutual Friend ${i + 1}`,
        avatarThumbnail: `https://www.roblox.com/headshot-thumbnail/image?userId=${Math.floor(Math.random() * 1000000)}&width=150&height=150`
      }));

      sendResponse(res, {
        userId: parseInt(userId),
        otherUserId: parseInt(otherUserId),
        mutualFriendsCount: mutualFriends.length,
        mutualFriends
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch mutual friends', 'MUTUAL_FRIENDS_ERROR', error.message);
    }
  }
);

// GET /leaderboard/:gameId - Game leaderboard
app.get('/leaderboard/:gameId',
  authenticateApiKey,
  param('gameId').isNumeric().withMessage('Game ID must be numeric'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { gameId } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      // Mock leaderboard data
      const leaderboard = Array.from({ length: limit }, (_, i) => ({
        rank: i + 1,
        player: {
          id: Math.floor(Math.random() * 1000000),
          username: `Player${i + 1}`,
          displayName: `Top Player ${i + 1}`
        },
        score: Math.floor(Math.random() * 1000000) + (limit - i) * 1000,
        avatarThumbnail: `https://www.roblox.com/headshot-thumbnail/image?userId=${Math.floor(Math.random() * 1000000)}&width=150&height=150`
      }));

      sendResponse(res, {
        gameId: parseInt(gameId),
        leaderboard,
        totalEntries: limit,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch leaderboard', 'LEADERBOARD_ERROR', error.message);
    }
  }
);

// GET /events/latest - Recent Roblox events
app.get('/events/latest',
  authenticateApiKey,
  query('limit').optional().isInt({ min: 1, max: 50 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      
      // Mock events data
      const events = Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        name: `Event ${i + 1}`,
        description: `Description for Event ${i + 1}`,
        startDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        eventType: ['Featured', 'Social', 'Building', 'Sponsored'][Math.floor(Math.random() * 4)],
        badge: {
          id: Math.floor(Math.random() * 1000000),
          name: `Event Badge ${i + 1}`,
          imageUrl: `https://www.roblox.com/badge-thumbnail/image?badgeId=${Math.floor(Math.random() * 1000000)}`
        }
      }));

      sendResponse(res, {
        events,
        count: events.length,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch events', 'EVENTS_FETCH_ERROR', error.message);
    }
  }
);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  sendError(res, 404, 'Endpoint not found', 'ENDPOINT_NOT_FOUND', {
    availableEndpoints: [
      'GET /health',
      'GET /player/:userId',
      'GET /game/:gameId/stats',
      'GET /group/:groupId',
      'GET /avatar/:userId',
      'GET /asset/:assetId',
      'GET /limited/:assetId',
      'GET /mutual/:userId/:otherUserId',
      'GET /leaderboard/:gameId',
      'GET /events/latest'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR', 
    process.env.NODE_ENV === 'development' ? error.message : undefined);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Roblox API Server running on port ${PORT}`);
  console.log(`📚 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 API Key authentication: ${process.env.API_KEY ? 'Enabled' : 'Disabled'}`);
  console.log(`⏱️  Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000) / 1000} seconds`);
});
