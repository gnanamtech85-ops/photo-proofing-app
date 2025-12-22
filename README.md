# PhotoProof - Client Proofing & Delivery Platform

A production-ready, mobile-first, white-label photo client proofing and delivery web application.

![PhotoProof](https://via.placeholder.com/1200x600/1e1b4b/ffffff?text=PhotoProof)

## ✨ Features

### Core Features
- 🔐 **Admin & Client Roles** - JWT-based authentication
- 📁 **Unlimited Galleries & Folders** - Organize photos efficiently
- 🔗 **Share Links + QR Codes** - Unique link per gallery with auto-generated QR
- ✅ **Client Photo Selection** - Real-time counter and selection system
- 👍 **Admin Approval Required** - Approve/reject client selections before download
- 💧 **Customizable Watermark** - Text/logo, opacity, font, size, 9 positions
- 📤 **Bulk Upload** - Drag & drop with thumbnail generation
- 📦 **ZIP Download** - Custom filename support
- 📅 **Gallery Expiry Date** - Time-limited access
- 🔒 **Password Protection** - Secure gallery access
- ⚙️ **Admin Toggles** - Allow/deny bulk download, client upload

### Client Side
- ☑️ **Select/Deselect All** - One-click bulk selection
- 🔍 **Filter Views** - View selected, favorites, or all
- 🖼️ **Lightbox View** - Fullscreen with swipe gestures
- 📱 **Mobile Optimized** - Touch-friendly responsive UI
- ❤️ **Favorites System** - Heart your favorite shots

### Admin Side
- 🔔 **Real-time Notifications** - When clients select/favorite photos
- ✅ **Approve/Reject Selections** - Control what clients can download
- 📊 **Dashboard with Stats** - Gallery analytics at a glance

### AI Features (Preview)
- 🏷️ **Auto Tagging** - Wedding, candid, portrait, group
- 👥 **Face Grouping** - Same person photos grouped
- 🔍 **Natural Language Search** - Tamil + English support
- 🎨 **Color Grading Preview** - Warm/Cool filters

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm 10.x or higher

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd spatial-planetary
```

2. **Install Backend Dependencies**
```bash
cd server
npm install
```

3. **Configure Environment**
```bash
cp ../.env.example .env
# Edit .env with your settings
```

4. **Install Frontend Dependencies**
```bash
cd ../client
npm install
```

### Running the Application

1. **Start Backend Server**
```bash
cd server
npm run dev
```
Server runs at http://localhost:5000

2. **Start Frontend Dev Server** (new terminal)
```bash
cd client
npm run dev
```
Frontend runs at http://localhost:5173

### Default Admin Login
- **Email:** admin@photoproof.com
- **Password:** admin123

## 📁 Project Structure

```
spatial-planetary/
├── client/                    # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # React context providers
│   │   └── pages/            # Page components
│   └── vite.config.js
├── server/                    # Node.js + Express backend
│   ├── controllers/          # Route handlers
│   ├── middleware/           # Auth, upload, watermark
│   ├── models/               # SQLite database
│   ├── routes/               # API routes
│   ├── utils/                # Helpers (QR, ZIP, AI)
│   └── index.js
├── uploads/                   # Photo storage
│   ├── originals/
│   ├── thumbnails/
│   └── watermarked/
├── database/                  # SQLite database
├── .env.example
└── README.md
```

## 🔧 Environment Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (change in production!)
JWT_SECRET=your-super-secret-key

# Database
DATABASE_PATH=./database/proofing.db

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50000000

# Frontend URL (for CORS and share links)
FRONTEND_URL=http://localhost:5173

# Default Admin
ADMIN_EMAIL=admin@photoproof.com
ADMIN_PASSWORD=admin123
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Galleries (Admin)
- `GET /api/galleries` - List galleries
- `POST /api/galleries` - Create gallery
- `GET /api/galleries/:id` - Get gallery details
- `PUT /api/galleries/:id` - Update gallery
- `DELETE /api/galleries/:id` - Delete gallery
- `GET /api/galleries/:id/qr` - Get QR code

### Photos (Admin)
- `POST /api/photos/upload` - Upload photos
- `GET /api/photos/gallery/:id` - Get photos
- `DELETE /api/photos/:id` - Delete photo

### Selections
- `POST /api/selections/toggle` - Toggle selection
- `POST /api/selections/select-all` - Select all
- `PUT /api/selections/:id/approve` - Approve
- `PUT /api/selections/:id/reject` - Reject

### Client Access
- `GET /api/client/gallery/:shareLink` - Access gallery
- `GET /api/client/gallery/:shareLink/download-zip` - Download ZIP

## 🎨 Customization

### White Label
The application is fully white-label ready. Customize:
- Logo and branding in `client/src/pages/Login.jsx`
- Colors in `client/src/index.css` (Tailwind config)
- Company name throughout components

### Watermark Positions
- `top-left`, `top-center`, `top-right`
- `center-left`, `center`, `center-right`
- `bottom-left`, `bottom-center`, `bottom-right`

## 🚀 Production Deployment

### Build Frontend
```bash
cd client
npm run build
```

### Serve with Node.js
The built files can be served from the Express server or any static host.

### Environment
- Set `NODE_ENV=production`
- Use a strong `JWT_SECRET`
- Configure proper `FRONTEND_URL`
- Set up reverse proxy (nginx) for production

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🤝 Support

For issues and feature requests, please open a GitHub issue.
