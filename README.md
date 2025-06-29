# Generator Log - Next.js App

A real-time generator management system built with Next.js 14, Supabase, and modern web technologies.

## Features

- **Real-time Dashboard**: Monitor generator status and activity in real-time
- **Role-based Access**: Separate dashboards for operators and administrators
- **Zone Management**: Organize generators by zones with operator assignments
- **Activity Logging**: Track all generator start/stop actions with timestamps
- **Responsive Design**: Works on desktop and mobile devices
- **Authentication**: Secure login system with JWT tokens

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with bcrypt password hashing
- **Styling**: CSS with responsive design
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ 
- Supabase account
- Vercel account (for deployment)

## Setup Instructions

### 1. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. Note down your Supabase URL and anon key

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
```

### 3. Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### 4. Vercel Deployment

1. **Connect to Vercel**:
   - Push your code to GitHub
   - Connect your repository to Vercel
   - Vercel will automatically detect Next.js

2. **Set Environment Variables in Vercel**:
   - Go to your Vercel project settings
   - Add the same environment variables as in `.env.local`
   - Redeploy after adding environment variables

3. **Deploy**:
   - Vercel will automatically deploy on every push to main branch
   - Or manually deploy from the Vercel dashboard

## Default Users

After running the schema, default users are created:

- **Admin**: `admin` / `admin123`
- **Operator**: `operator` / `operator123`

## API Routes

The app uses Next.js API routes for serverless functions:

- `POST /api/login` - User authentication
- `POST /api/register` - User registration
- `GET /api/generators` - Fetch generators (with role-based filtering)
- `POST /api/generators/[id]/[action]` - Start/stop generators
- `GET /api/zones` - Fetch zones
- `POST /api/zones/complete` - Create new zone with generators
- `PUT /api/zones/[id]` - Update zone
- `GET /api/users` - Fetch users (admin only)
- `GET /api/logs` - Fetch activity logs (with role-based filtering)

## Project Structure

```
app/
├── api/                    # Next.js API routes
│   ├── login/
│   ├── register/
│   ├── generators/
│   ├── zones/
│   ├── users/
│   └── logs/
├── components/             # React components
│   ├── Login.js
│   ├── Register.js
│   ├── Dashboard.js
│   ├── AdminDashboard.js
│   └── Navigation.js
├── contexts/              # React contexts
│   ├── AuthContext.js
│   └── SocketContext.js
├── login/                 # Login page
├── register/              # Register page
├── globals.css            # Global styles
├── layout.js              # Root layout
├── page.js                # Home page
└── providers.js           # Context providers
```

## Features by Role

### Operator Dashboard
- View assigned generators only
- Start/stop generators
- View activity logs
- Location tracking for actions

### Administrator Dashboard
- View all generators and zones
- Create and edit zones
- Assign operators to zones
- Monitor all activity
- User management

## Real-time Updates

The app uses polling to fetch updates every 10 seconds, which works well with Vercel's serverless architecture.

## Security

- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Environment variable protection
- Supabase Row Level Security (RLS)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 