# Generator Log Application

A web-based application for managing generator operations with operator registration, zone management, and real-time monitoring capabilities.

## Features

### 🔐 Authentication & User Management
- **Operator Registration**: New operators can register with their details
- **Role-based Access**: Separate dashboards for operators and administrators
- **Secure Login**: JWT-based authentication with password hashing

### 🏭 Generator Management
- **Zone-based Organization**: Generators are organized by zones
- **Start/Stop Logging**: Operators can log generator start and stop actions
- **Location Tracking**: Optional location stamping for each action
- **Timestamp Recording**: Automatic timestamp recording for all actions

### 👥 Operator Features
- **Assigned Zones**: Operators are assigned to specific zones
- **Generator Control**: Start and stop generators in their assigned zones
- **Activity History**: View their own activity logs
- **Real-time Updates**: Live updates when generators change status

### 👨‍💼 Administrator Features
- **Real-time Dashboard**: Live monitoring of all generators
- **Zone Management**: Assign operators to zones
- **User Management**: View all registered operators
- **Comprehensive Logs**: View all activity across the system
- **Statistics**: Overview of system status and metrics

### 🔄 Real-time Updates
- **Socket.IO Integration**: Live updates across all connected clients
- **Instant Notifications**: Toast notifications for status changes
- **Live Status Display**: Real-time generator status updates

## Technology Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **UUID** for unique identifiers

### Frontend
- **React.js** with functional components and hooks
- **React Router** for navigation
- **Axios** for API communication
- **Socket.IO Client** for real-time updates
- **React Hot Toast** for notifications

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### 1. Clone and Install Dependencies
```bash
# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
JWT_SECRET=your-secret-key-here
PORT=5000
```

### 3. Start the Application
```bash
# Start both server and client in development mode
npm run dev

# Or start them separately:
npm run server    # Starts backend on port 5000
npm run client    # Starts frontend on port 3000
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Default Credentials

### Administrator Account
- **Username**: admin
- **Password**: admin123

## Usage Guide

### For Operators

1. **Registration**: New operators can register at `/register`
2. **Login**: Use your credentials to access the operator dashboard
3. **Generator Control**: 
   - View assigned generators
   - Enter your location (optional)
   - Click "Start Generator" or "Stop Generator"
4. **Activity Tracking**: View your recent activity in the dashboard

### For Administrators

1. **Login**: Use admin credentials to access the administrator dashboard
2. **Zone Management**:
   - View all zones and their current assignments
   - Assign operators to zones using the dropdown
3. **Real-time Monitoring**:
   - View live status of all generators
   - Monitor operator activity
4. **User Management**:
   - View all registered operators
   - See operator assignments and details

## API Endpoints

### Authentication
- `POST /api/register` - Register new operator
- `POST /api/login` - User login

### Generators
- `GET /api/generators` - Get generators (filtered by user role)
- `POST /api/generators/:id/start` - Start generator
- `POST /api/generators/:id/stop` - Stop generator

### Zones
- `GET /api/zones` - Get all zones
- `POST /api/zones/:id/assign-operator` - Assign operator to zone

### Users & Logs
- `GET /api/users` - Get all users (admin only)
- `GET /api/logs` - Get activity logs (filtered by user role)

## Data Structure

### Users
```javascript
{
  id: "uuid",
  username: "string",
  password: "hashed",
  name: "string",
  email: "string",
  role: "operator" | "administrator"
}
```

### Zones
```javascript
{
  id: "uuid",
  name: "string",
  location: "string",
  assignedOperator: "operator-id" | null
}
```

### Generators
```javascript
{
  id: "uuid",
  name: "string",
  zoneId: "zone-id",
  status: "running" | "offline",
  lastOperator: "operator-id" | null
}
```

### Logs
```javascript
{
  id: "uuid",
  generatorId: "generator-id",
  operatorId: "operator-id",
  operatorName: "string",
  action: "start" | "stop",
  timestamp: "ISO-string",
  location: "string",
  status: "running" | "offline"
}
```

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: API endpoints protected by user roles
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Configured CORS for security

## Real-time Features

- **Live Updates**: Generator status changes are broadcast to all connected clients
- **Instant Notifications**: Toast notifications for status changes
- **Real-time Dashboard**: Administrator dashboard updates in real-time
- **Socket Connection**: Automatic reconnection handling

## Production Deployment

### Environment Variables
```env
NODE_ENV=production
JWT_SECRET=your-secure-secret-key
PORT=5000
```

### Build Process
```bash
# Build the React application
npm run build

# The built files will be in client/build/
```

### Database Integration
For production use, replace the in-memory storage with a database:
- **MongoDB** with Mongoose
- **PostgreSQL** with Sequelize
- **MySQL** with Sequelize

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support or questions, please open an issue in the repository. 