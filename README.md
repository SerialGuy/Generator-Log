# Generator Log System

A comprehensive web application for managing diesel generators, tracking fuel consumption, generating bills, and monitoring maintenance schedules.

## 🚀 Features

### Core Functionality
- **Multi-Role User Management**: Admin, Technician, Commercial, and Client roles
- **Zone & Asset Management**: Organize generators by zones with technician assignments
- **Enhanced Logging**: Track start/stop times, fuel consumption, maintenance, and faults
- **Real-time Monitoring**: Live status updates and notifications
- **Mobile-Friendly Interface**: Responsive design for field technicians

### Advanced Features
- **Fuel Cost Calculation**: Automatic billing based on consumption and fuel prices
- **PDF Bill Generation**: Professional invoice creation with detailed breakdowns
- **Notification System**: Alerts for faults, maintenance due, and overdue logs
- **Audit Trails**: Complete tracking of all system changes
- **Data Export**: Excel and CSV export capabilities
- **File Attachments**: Support for photos and documents in logs

### Dashboard & Analytics
- **Real-time Charts**: Generator status distribution and fuel consumption trends
- **Performance Metrics**: Runtime hours, fuel efficiency, and cost analysis
- **Maintenance Scheduling**: Automated reminders and maintenance tracking
- **Billing Management**: Complete billing cycle from generation to payment

## 🛠 Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: JWT with role-based access control
- **Charts**: Chart.js with React Chart.js 2
- **PDF Generation**: jsPDF with AutoTable
- **File Upload**: React Dropzone
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Modern web browser

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd generator-log-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
   - Get your project URL and anon key

4. **Configure environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 👥 User Roles & Permissions

### Administrator
- Full system access
- User management
- Zone and generator configuration
- System settings
- Audit trail access
- Billing management

### Technician (Operator)
- View assigned zones and generators
- Create detailed logs with fuel tracking
- Report faults and maintenance
- Upload attachments
- View notifications

### Commercial
- Billing dashboard access
- Fuel price management
- Bill generation and tracking
- Client communication

### Client
- View own billing information
- Access to assigned zone data
- Payment tracking

## 📊 Database Schema

The system includes the following main tables:

- **users**: User accounts with role-based permissions
- **zones**: Geographic zones containing generators
- **generators**: Individual generator units with specifications
- **logs**: Detailed activity logs with fuel consumption
- **fuel_prices**: Historical fuel pricing data
- **billing**: Invoice generation and payment tracking
- **notifications**: System alerts and reminders
- **audit_logs**: Complete change tracking
- **system_settings**: Configuration management

## 🔧 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration

### Core Data
- `GET /api/generators` - List generators
- `POST /api/generators/[id]/[action]` - Generator actions
- `GET /api/zones` - List zones
- `GET /api/logs` - List logs
- `POST /api/logs` - Create log entry

### Billing & Finance
- `GET /api/billing` - List bills
- `POST /api/billing` - Generate new bill
- `GET /api/fuel-prices` - Fuel price history
- `POST /api/fuel-prices` - Update fuel price

### System Management
- `GET /api/settings` - System settings
- `POST /api/settings` - Update settings
- `GET /api/notifications` - User notifications
- `GET /api/audit-logs` - Audit trail

## 📱 Mobile Optimization

The application is fully responsive and optimized for mobile devices:

- Touch-friendly interface
- Swipe gestures for navigation
- Optimized forms for mobile input
- Camera integration for photo attachments
- Offline capability for basic functions

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Audit logging for all changes
- Secure file upload handling

## 📈 Monitoring & Analytics

### Real-time Metrics
- Generator status monitoring
- Fuel consumption tracking
- Runtime efficiency analysis
- Cost per hour calculations
- Maintenance schedule compliance

### Reporting
- Daily/monthly runtime reports
- Fuel usage trends
- Fault frequency analysis
- Cost analysis by zone/generator
- Maintenance history

## 🚨 Notifications & Alerts

### Automated Alerts
- Generator fault notifications
- Maintenance due reminders
- Low fuel level warnings
- Overdue log entries
- Payment reminders

### Communication Channels
- In-app notifications
- Email notifications (configurable)
- SMS alerts (future enhancement)

## 🔄 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=production
```

### Recommended Hosting
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- DigitalOcean App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **IoT Integration**: Real-time generator monitoring
- **Mobile App**: Native iOS/Android applications
- **Advanced Analytics**: Machine learning for predictive maintenance
- **Multi-language Support**: Internationalization
- **API Integration**: Third-party system connections
- **Advanced Reporting**: Custom report builder
- **Workflow Automation**: Automated task assignments
- **Inventory Management**: Spare parts tracking

---

**Built with ❤️ for efficient generator management** 