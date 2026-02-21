# 🏛️ Church Member Manager

A modern Progressive Web App (PWA) for managing church members, templates, and service schedules.

## ✨ Features

- 📱 **PWA Installable** - Install on any device like a native app
- 🌐 **Multi-language** - English and Spanish support
- 👥 **Member Management** - Add, search, and organize church members
- 📋 **Template System** - Create custom templates with identification fields
- 📅 **Services Schedule** - Assign members to specific service dates
- 👑 **Leadership Tracking** - Mark and identify church leaders
- 🔐 **Authentication** - Secure login with master/regular user roles
- 📄 **PDF Export** - Generate member lists as PDFs
- 💾 **Shared Database** - All users collaborate on the same data
- 🎨 **Modern UI** - Dark theme with glassmorphism design
- 📶 **Offline Support** - Works without internet after first load

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Tech Stack

- **React** - UI framework
- **Vite** - Build tool
- **Vanilla CSS** - Styling
- **jsPDF** - PDF generation
- **Lucide React** - Icons
- **PWA** - Service Worker + Manifest

## 🏗️ Project Structure

```
src/
├── components/         # React components
│   ├── Auth.jsx       # Login/Signup
│   ├── Settings.jsx   # Settings modal
│   ├── Sidebar.jsx    # Navigation
│   ├── TemplateView.jsx
│   ├── ServicesView.jsx
│   └── ...
├── context/           # React Context
│   ├── AuthContext.jsx
│   ├── LanguageContext.jsx
│   └── StorageContext.jsx
├── utils/             # Utilities
│   ├── translations.js
│   └── pdfGenerator.js
├── styles/            # CSS
│   └── index.css
└── main.jsx          # Entry point

public/
├── manifest.json     # PWA manifest
└── sw.js            # Service worker
```

## 👥 User Roles

### Master User
- Full access to all features
- Can delete templates, members, and services
- Indicated by account type badge

### Regular User
- Can view all data
- Can add templates and members
- Cannot delete (view-only for deletions)

## 🌍 Multi-language

Switch between English and Spanish in Settings. All UI elements are fully translated.

## 📱 Installing as PWA

### Android
1. Open in Chrome/Edge
2. Tap "Add to Home Screen"
3. Tap "Install"

### iOS
1. Open in Safari
2. Tap Share button
3. Select "Add to Home Screen"

### Desktop
1. Open in Chrome/Edge
2. Click install icon in address bar
3. Click "Install"

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

### GitHub Pages
1. Build: `npm run build`
2. Upload `dist/` folder to GitHub
3. Enable Pages in repo settings

## 🔧 Configuration

### App Icons
Create PNG icons and place in `/public/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

Use the included script or online generators:
```bash
node create-icons.js
```

### Updating Service Worker
Change cache version in `/public/sw.js`:
```javascript
const CACHE_NAME = 'church-mgr-v2'; // Increment version
```

## 🔐 Security Note

⚠️ **Current Implementation**: Uses localStorage for data and authentication. Suitable for demos and internal tools.

For production with sensitive data, consider:
- Backend API (Node.js, etc.)
- Real database (PostgreSQL, MongoDB)
- Secure authentication (JWT, OAuth)
- Encrypted passwords (bcrypt)

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Support

For questions or issues, please open a GitHub issue.

---

Made with ❤️ for church communities
