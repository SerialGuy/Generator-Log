# Generator Log - Unified Next.js App

A modern web-based generator logging application built with Next.js and Express.js, featuring real-time monitoring and management of generators with operator and administrator roles. **Everything runs on a single server!**

## Features

- **Unified Deployment**: Frontend, backend, and Socket.IO all run on one server
- **Real-time Updates**: Live generator status updates using Socket.IO
- **Role-based Access**: Separate dashboards for operators and administrators
- **Zone Management**: Organize generators by zones with assigned operators
- **Activity Logging**: Comprehensive logging of all generator actions
- **Responsive Design**: Modern UI that works on desktop and mobile devices
- **Authentication**: Secure login system with JWT tokens

## Tech Stack

- **Full Stack**: Next.js 14 + Express.js + Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO
- **Styling**: CSS with responsive design
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd generator-log-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
   - Get your Supabase URL and anon key

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret_key
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   PORT=3000
   ```

5. **Start the unified server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## Default Users

The application creates default users on first run:

- **Administrator**: `admin` / `admin123`
- **Operator**: `operator` / `operator123`

## Project Structure

```
Generator Log/
├── app/                    # Next.js App Router
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   ├── login/             # Login page
│   ├── page.js            # Home page
│   ├── providers.js       # Context providers
│   └── register/          # Register page
├── server.js              # Unified Express.js + Next.js server
├── supabase-schema.sql    # Database schema
├── package.json           # Dependencies and scripts
└── next.config.js         # Next.js configuration
```

## API Endpoints

All API endpoints are handled by the unified server:

- `POST /api/register` - User registration
- `POST /api/login` - User authentication
- `GET /api/generators` - Generator management
- `POST /api/generators/:id/:action` - Start/stop generators
- `GET /api/zones` - Zone management
- `POST /api/zones/complete` - Create zones with generators
- `PUT /api/zones/:id` - Update zones
- `GET /api/users` - User management (admin only)
- `GET /api/logs` - Activity logs

## Development

```bash
npm run dev
```

This starts the unified server on port 3000 with:
- Next.js frontend
- Express.js API routes
- Socket.IO real-time communication
- Hot reloading for development

## Production Deployment

### Option 1: Vercel (Recommended)
```bash
npm run build
npm start
```

### Option 2: Any Node.js Hosting
```bash
npm run build
NODE_ENV=production npm start
```

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Key Features

### Operator Dashboard
- View assigned generators
- Start/stop generators
- Real-time status updates
- Activity history

### Administrator Dashboard
- Manage all zones and generators
- Create new zones with multiple generators
- Assign operators to zones
- View comprehensive activity logs
- Real-time monitoring of all generators

### Real-time Features
- Live generator status updates
- Instant notifications for actions
- Socket.IO integration for real-time communication

### Unified Benefits
- **Single Deployment**: No need for separate frontend/backend hosting
- **Simplified Setup**: One command to start everything
- **Better Performance**: No CORS issues or network latency
- **Easier Scaling**: Single server to scale
- **Cost Effective**: Only one hosting service needed

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `NEXT_PUBLIC_APP_URL` | Your app URL (for production) | No |
| `PORT` | Server port (default: 3000) | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 