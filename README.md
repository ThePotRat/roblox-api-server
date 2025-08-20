# Roblox API Server

A complete, production-ready Node.js + Express API server for Roblox-related data. This API provides comprehensive endpoints for accessing player information, game statistics, group data, and more.

## 🚀 Features

- **Complete API Coverage**: 9+ endpoints covering players, games, groups, assets, and events
- **Production Ready**: Built with security, rate limiting, and error handling
- **Real Data Integration**: Fetches from official Roblox APIs when available
- **Smart Caching**: Built-in caching system to improve performance
- **Flexible Authentication**: Optional API key authentication
- **Comprehensive Documentation**: Full endpoint documentation with examples
- **Cloud Deployment Ready**: Configured for Render, Railway, Vercel, and other platforms

## 📋 Requirements

- Node.js 18.0.0 or higher
- npm or yarn package manager

## 🛠️ Quick Setup

### Local Development

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd roblox-api-server
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Test the API**
   ```bash
   curl http://localhost:3000/health
   ```

### Production Deployment

#### Deploy to Render
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy with build command: `npm install`
4. Start command: `npm start`

#### Deploy to Railway
1. Connect repository to Railway
2. Railway will auto-detect the Node.js app
3. Set environment variables in Railway dashboard
4. Deploy automatically

#### Deploy to Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod`
3. Set environment variables in Vercel dashboard

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Security (Optional - if not set, API runs without authentication)
API_KEY=your-secret-api-key-here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📚 API Documentation

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-app.render.com` (or your deployment URL)

### Authentication (Optional)
Include API key in either:
- **Header**: `X-API-Key: your-api-key`
- **Query Parameter**: `?apiKey=your-api-key`

### Rate Limiting
- Default: 100 requests per minute per IP
- Configurable via environment variables

---

## 🎯 API Endpoints

### Health Check
**GET** `/health`

Check API status and uptime.

**Response:**
```json
{
  "success": true,
  "message": "API is healthy",
  "data": {
    "status": "OK",
    "uptime": 3600.123,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

---

### Player Information
**GET** `/player/:userId`

Get comprehensive player profile data.

**Parameters:**
- `userId` (number, required): Roblox user ID

**Example Request:**
```bash
curl "https://your-api.com/player/1" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "userId": 1,
    "username": "Roblox",
    "displayName": "Roblox",
    "description": "The official Roblox account",
    "created": "2006-02-27T21:06:40.3Z",
    "isBanned": false,
    "friendsCount": 1247,
    "avatarThumbnail": "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/150/150/AvatarHeadshot/Png",
    "hasVerifiedBadge": true
  }
}
```

---

### Game Statistics
**GET** `/game/:gameId/stats`

Get detailed game statistics and information.

**Parameters:**
- `gameId` (number, required): Roblox universe/game ID

**Example Request:**
```bash
curl "https://your-api.com/game/920587237/stats" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "gameId": 920587237,
    "name": "Adopt Me!",
    "description": "The #1 pet game on Roblox!",
    "creator": {
      "id": 1681457,
      "name": "DreamCraft",
      "type": "Group"
    },
    "visits": 29850000000,
    "playing": 185000,
    "favorites": 8500000,
    "maxPlayers": 48,
    "created": "2017-07-14T17:55:01.87Z",
    "updated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Group Information
**GET** `/group/:groupId`

Get detailed information about a Roblox group.

**Parameters:**
- `groupId` (number, required): Roblox group ID

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": 1681457,
    "name": "DreamCraft",
    "description": "The creators of Adopt Me!",
    "owner": {
      "userId": 23415609,
      "username": "NewFissy",
      "displayName": "NewFissy"
    },
    "memberCount": 8547293,
    "isBuildersClubOnly": false,
    "publicEntryAllowed": true,
    "hasVerifiedBadge": true
  }
}
```

---

### Avatar Thumbnail
**GET** `/avatar/:userId`

Get user avatar thumbnail with customizable size.

**Parameters:**
- `userId` (number, required): Roblox user ID
- `size` (string, optional): Thumbnail size (30x30, 48x48, 60x60, 75x75, 100x100, 110x110, 150x150, 180x180, 352x352, 420x420, 720x720)

**Example Request:**
```bash
curl "https://your-api.com/avatar/1?size=420x420" \
  -H "X-API-Key: your-api-key"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "userId": 1,
    "imageUrl": "https://tr.rbxcdn.com/38c6edcb50633730ff4cf39ac8859840/420/420/AvatarHeadshot/Png",
    "state": "Completed",
    "size": "420x420"
  }
}
```

---

### Asset Details
**GET** `/asset/:assetId`

Get information about a Roblox asset/item.

**Parameters:**
- `assetId` (number, required): Roblox asset ID

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "assetId": 1365767,
    "name": "Dominus Empyreus",
    "description": "A legendary dominus hat",
    "assetType": {
      "id": 8,
      "name": "Hat"
    },
    "creator": {
      "id": 1,
      "name": "Roblox",
      "type": "User"
    },
    "price": 13370,
    "isLimited": true,
    "isLimitedUnique": true,
    "remaining": 26,
    "sales": 101,
    "created": "2008-05-01T16:20:00.000Z"
  }
}
```

---

### Limited Item Market Data
**GET** `/limited/:assetId`

Get market data for limited items including price history and recent sales.

**Parameters:**
- `assetId` (number, required): Limited item asset ID

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "assetId": 1365767,
    "name": "Dominus Empyreus",
    "recentAveragePrice": 2500000,
    "originalPrice": 13370,
    "priceDataPoints": [
      {
        "value": 2450000,
        "date": "2024-01-15T10:30:00.000Z"
      }
    ],
    "recentSales": [
      {
        "userAssetId": 12345678,
        "seller": {
          "id": 123456,
          "name": "Seller1"
        },
        "price": 2450000,
        "serialNumber": 45,
        "dateTime": "2024-01-15T09:15:00.000Z"
      }
    ]
  }
}
```

---

### Mutual Friends
**GET** `/mutual/:userId/:otherUserId`

Get mutual friends between two users.

**Parameters:**
- `userId` (number, required): First user ID
- `otherUserId` (number, required): Second user ID

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "userId": 1,
    "otherUserId": 261,
    "mutualFriendsCount": 15,
    "mutualFriends": [
      {
        "id": 12345,
        "username": "MutualFriend1",
        "displayName": "Mutual Friend 1",
        "avatarThumbnail": "https://tr.rbxcdn.com/image1/150/150/AvatarHeadshot/Png"
      }
    ]
  }
}
```

---

### Game Leaderboard
**GET** `/leaderboard/:gameId`

Get leaderboard data for a specific game.

**Parameters:**
- `gameId` (number, required): Roblox game ID
- `limit` (number, optional): Number of entries to return (1-100, default: 50)

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "gameId": 920587237,
    "leaderboard": [
      {
        "rank": 1,
        "player": {
          "id": 12345,
          "username": "TopPlayer",
          "displayName": "Top Player"
        },
        "score": 1250000,
        "avatarThumbnail": "https://tr.rbxcdn.com/image/150/150/AvatarHeadshot/Png"
      }
    ],
    "totalEntries": 50,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Latest Events
**GET** `/events/latest`

Get recent Roblox events and promotions.

**Parameters:**
- `limit` (number, optional): Number of events to return (1-50, default: 10)

**Example Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "events": [
      {
        "id": 1,
        "name": "Winter Event 2024",
        "description": "Celebrate winter with special rewards!",
        "startDate": "2024-12-15T00:00:00.000Z",
        "endDate": "2024-01-31T23:59:59.000Z",
        "eventType": "Featured",
        "badge": {
          "id": 123456789,
          "name": "Winter Champion",
          "imageUrl": "https://tr.rbxcdn.com/badge-image.png"
        }
      }
    ],
    "count": 1,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 📝 Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input parameters
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INVALID_API_KEY`: Missing or invalid API key
- `ENDPOINT_NOT_FOUND`: Invalid endpoint
- `INTERNAL_ERROR`: Server error

## 🚀 Performance

- **Caching**: 5-minute cache for API responses
- **Rate Limiting**: Configurable per-IP limits
- **Timeouts**: 10-second timeout for external API calls
- **Error Recovery**: Graceful fallback to mock data when APIs fail

## 🔐 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request handling
- **Input Validation**: Comprehensive parameter validation
- **Rate Limiting**: DDoS protection
- **API Key Authentication**: Optional access control

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📜 License

MIT License - see LICENSE file for details

## 🆘 Support

- Create an issue for bug reports
- Check existing issues before posting
- Provide detailed reproduction steps

---

**Happy coding! 🎮**
