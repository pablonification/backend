# Lab Kimia Dasar - Backend API

This is the backend API server for the Lab Kimia Dasar website, built with Express.js and Supabase.

## Features

- **Authentication**: JWT-based admin authentication with Supabase Auth
- **File Management**: Secure file upload and download with password protection
- **CRUD Operations**: Complete CRUD for sliders, announcements, files, modules, and grades
- **Search**: Site-wide search functionality
- **Security**: Rate limiting, CORS, helmet, and input validation
- **File Security**: Password-protected file downloads with signed URLs

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **File Storage**: Supabase Storage
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Custom middleware and validators

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
```

3. Fill in your environment variables in `.env`:
```env
PORT=5001
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5001`

### Production

Build and start the production server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Admin logout
- `GET /api/auth/me` - Get current user

### Sliders (Admin only)
- `GET /api/sliders` - Get all sliders
- `POST /api/sliders` - Create slider
- `PUT /api/sliders/:id` - Update slider
- `DELETE /api/sliders/:id` - Delete slider

### Announcements
- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement (Admin only)
- `GET /api/announcements/:id` - Get announcement by ID
- `PUT /api/announcements/:id` - Update announcement (Admin only)
- `DELETE /api/announcements/:id` - Delete announcement (Admin only)

### Files
- `GET /api/files` - Get all files
- `POST /api/files` - Upload file (Admin only)
- `GET /api/files/:id` - Get file info
- `POST /api/files/:id/verify-password` - Verify file password
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file (Admin only)

### Modules
- `GET /api/modules` - Get all modules
- `POST /api/modules` - Create module (Admin only)
- `GET /api/modules/:id` - Get module by ID
- `PUT /api/modules/:id` - Update module (Admin only)
- `DELETE /api/modules/:id` - Delete module (Admin only)

### Grade Files
- `GET /api/nilai` - Get all grade files
- `POST /api/nilai` - Upload grade file (Admin only)
- `GET /api/nilai/:id` - Get grade file info
- `POST /api/nilai/:id/verify-password` - Verify grade file password
- `GET /api/nilai/:id/download` - Download grade file
- `DELETE /api/nilai/:id` - Delete grade file (Admin only)

### Search
- `GET /api/search?q=query` - Search content

## Project Structure

```
backend/
├── routes/                 # API route handlers
│   ├── auth.js
│   ├── sliders.js
│   ├── announcements.js
│   ├── files.js
│   ├── modules.js
│   ├── nilai.js
│   └── search.js
├── middleware/             # Express middleware
│   ├── auth.js
│   ├── cors.js
│   └── errorHandler.js
├── lib/                    # Utilities and configurations
│   ├── supabase.js
│   ├── password.js
│   └── storage.js
├── server.js               # Main server file
├── package.json
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5001) |
| `NODE_ENV` | Environment | No (default: development) |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `CORS_ORIGIN` | Frontend URL for CORS | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | JWT expiration time | No (default: 7d) |

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain only
- **Helmet**: Security headers
- **Input Validation**: All inputs validated and sanitized
- **File Security**: Password-protected downloads
- **JWT Authentication**: Secure admin authentication

## File Upload

Files are uploaded to Supabase Storage with the following structure:
- `sliders/` - Homepage slider images
- `announcements/` - Announcement attachments
- `files/` - General files
- `modules/` - Praktikum modules
- `nilai/` - Grade files

## Password Protection

Files can be protected with passwords:
1. Admin sets password when uploading file
2. Password is hashed with bcrypt and stored in database
3. User enters password to download file
4. Backend verifies password and generates signed URL
5. Frontend receives signed URL for download

## Error Handling

All errors are handled consistently:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Deployment

This project is designed to be deployed on:
- **VPS**: Ubuntu/CentOS with PM2
- **Heroku**: Direct deployment
- **Railway**: Container deployment
- **DigitalOcean App Platform**: Managed deployment

### VPS Deployment

1. Install Node.js and PM2
2. Clone repository
3. Install dependencies: `npm install --production`
4. Set environment variables
5. Start with PM2: `pm2 start server.js --name lab-kimia-api`

### Heroku Deployment

1. Create Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy: `git push heroku main`

## Contributing

1. Follow the existing code style
2. Add proper error handling
3. Write meaningful commit messages
4. Test your changes thoroughly

## License

This project is part of the Lab Kimia Dasar website system.
