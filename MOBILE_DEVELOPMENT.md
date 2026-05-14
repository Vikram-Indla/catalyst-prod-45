# Catalyst Mobile Development

This document describes the Catalyst iOS mobile app and how it connects to the web backend.

## Repository Structure

### Web Backend (this repo)
- **Location:** https://github.com/Vikram-Indla/catalyst-prod-45
- **Tech Stack:** Next.js, React, TypeScript, Supabase
- **Port:** `http://localhost:8080`
- **API:** REST + GraphQL endpoints for mobile consumption

### Mobile Frontend (separate repo)
- **Location:** https://github.com/Vikram-Indla/CatyMobile
- **Tech Stack:** Swift, SwiftUI, iOS 16+
- **Platform:** Native iOS app
- **Architecture:** MVVM with Combine reactive framework

## Development Setup

### For Web Developers (catalyst-prod-45)
No additional setup needed. The web backend automatically serves API endpoints that the mobile app consumes.

### For Mobile Developers (CatyMobile)

1. Clone the mobile repository:
   ```bash
   git clone https://github.com/Vikram-Indla/CatyMobile.git
   ```

2. Follow setup instructions in `CatyMobile/README.md`

3. Install Xcode and Git integration (see below)

4. Open `CatalystApp.xcodeproj` in Xcode

## Git Integration for macOS

If you don't have Git installed on your Mac, follow these steps:

### Option 1: Download Installer (Simple)
1. Go to https://git-scm.com/install/mac
2. Download the latest macOS installer
3. Run the `.dmg` file and follow instructions
4. Verify installation:
   ```bash
   git --version
   ```

### Option 2: Homebrew (Recommended)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git
brew install git

# Verify
git --version
```

### Configure Git
```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --list
```

## API Communication

### Base URL
The mobile app connects to the Catalyst backend at:
- **Local Development:** `http://localhost:8080/api`
- **Staging:** `https://catalyst-staging.example.com/api`
- **Production:** `https://catalyst.example.com/api`

### Authentication
Mobile app uses the same authentication system as the web:
- Supabase Auth token-based
- OAuth 2.0 with Jira Cloud
- Session-based cookie auth

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/spaces` | GET | Fetch all spaces |
| `/api/work-items` | GET | Fetch all work items |
| `/api/work-items/:id` | GET | Fetch single work item |
| `/api/work-items` | POST | Create work item |
| `/api/work-items/:id` | PATCH | Update work item |
| `/api/notifications` | GET | Fetch notifications |

## Data Synchronization

The mobile app and web app share:
- **Single Source of Truth:** Supabase database
- **Real-time Sync:** Jira Cloud sync via `wh-jira-sync` service
- **Offline Mode:** Local SQLite cache on mobile (auto-syncs when online)

## Development Workflow

### Web Developers
1. Make API changes in catalyst-prod-45
2. Update endpoint contracts if needed
3. Run `npm run dev` to test locally
4. Mobile team will integrate new endpoints

### Mobile Developers
1. Clone CatyMobile repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Implement feature in Swift/SwiftUI
4. Test against local web backend (`http://localhost:8080`)
5. Push to GitHub and create PR

### Integration Testing
1. Start web backend locally: `npm run dev` (catalyst-prod-45)
2. Run mobile app in simulator:
   ```bash
   open CatalystApp.xcodeproj
   # In Xcode: Product → Run (⌘R)
   ```
3. Test end-to-end flows

## Testing

### Web (catalyst-prod-45)
```bash
npm test              # Unit tests
npm run test:e2e      # E2E tests
npm run test:coverage # Coverage report
```

### Mobile (CatyMobile)
```bash
# In Xcode or CLI
xcodebuild test -project CatalystApp.xcodeproj -scheme CatalystApp
```

## Troubleshooting

### Mobile App Can't Connect to Web Backend
- Verify web backend is running: `http://localhost:8080`
- Check mobile app `.env.local` points to correct URL
- Verify both are on same network (Wi-Fi)

### Xcode Build Failures
- Ensure iOS 16.0+ deployment target
- Run: `xcodebuild clean -project CatalystApp.xcodeproj`
- Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData/*`
- Rebuild: `⌘B` in Xcode

### Git Authentication Issues
- Verify SSH key is added to GitHub: `ssh -T git@github.com`
- Or use HTTPS with personal access token
- See GitHub docs for troubleshooting

## Architecture Decisions

### Why Native Swift?
- Best iOS performance and UX
- Direct access to iOS features (push notifications, biometrics, camera)
- Type-safe backend communication

### Why Shared Supabase Backend?
- Single source of truth for data
- Automatic real-time sync across web and mobile
- No custom mobile-specific API layer needed

## Future Enhancements

- [ ] Android version (React Native or Kotlin)
- [ ] Offline-first improvements
- [ ] Push notification hub
- [ ] Widget support
- [ ] Siri Shortcuts integration

---

For questions about mobile development, see [CatyMobile](https://github.com/Vikram-Indla/CatyMobile) repository.
