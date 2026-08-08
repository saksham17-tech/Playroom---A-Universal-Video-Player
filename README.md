# PLAYLROOM - UNIVERSAL VIDEO PLAYER
================================================================================

A modern, web-based universal video player with special optimization for IMAX 
1.43:1 aspect ratio content. Built with React, TypeScript, and TanStack Start.

================================================================================
TABLE OF CONTENTS
================================================================================

1. Project Overview
2. Key Features
3. Technology Stack
4. Prerequisites
5. Installation & Setup
6. Project Structure
7. Development Workflow
8. Building for Production
9. Browser Support
10. Contributing
11. License
12. Contact & Support

================================================================================
1. PROJECT OVERVIEW
================================================================================

Playroom is a universal video player designed to handle virtually any video format
in the browser. It was created to address the specific challenge of playing IMAX
1.43:1 format content, which has a unique aspect ratio that many standard players
don't handle correctly.

The player provides a clean, responsive interface that works across devices and
prioritizes performance. It's built as a single-page application using modern
React patterns and is fully open source.

Key differentiators:
- Native-like video playback experience in the browser
- Automatic aspect ratio detection and optimization
- Lightweight footprint with minimal dependencies
- Extensible architecture for adding new features

================================================================================
2. KEY FEATURES
================================================================================

VIDEO FORMAT SUPPORT
- MP4 (H.264, H.265/HEVC)
- WebM (VP8, VP9)
- OGG (Theora)
- AVI (experimental)
- MOV (limited)
- MKV (limited)
- And more via browser capabilities

IMAX OPTIMIZATION
- Special rendering for 1.43:1 aspect ratio
- Maintains correct aspect ratio without black bars
- Optimized for large screen viewing
- Subtle UI adjustments for cinematic experience

USER INTERFACE
- Clean, minimal design with Tailwind CSS
- Fully responsive (desktop, tablet, mobile)
- Dark/light theme support
- Keyboard shortcuts for playback control
- Volume control with visual feedback

PERFORMANCE
- Built with TanStack Start for optimal routing
- Lazy loading for faster initial load
- Minimal JavaScript bundle size
- Hardware-accelerated video decoding where available

================================================================================
3. TECHNOLOGY STACK
================================================================================

FRONTEND FRAMEWORK
- React 18+ (with hooks and functional components)
- TanStack Start (formerly TanStack Router + React Query)
- TypeScript 5+ for type safety

STYLING
- Tailwind CSS 3+ with custom configuration
- PostCSS for processing

BUILD TOOLS
- Vite 4+ for fast development and building
- ESLint for code quality
- Prettier for code formatting

PACKAGE MANAGEMENT
- npm (default) or Bun (alternative)

ADDITIONAL LIBRARIES
- React Player or native HTML5 video API
- Custom hooks for video controls
- Optional: HLS.js/Dash.js for streaming support

================================================================================
4. PREREQUISITES
================================================================================

Before you begin, ensure you have the following installed on your system:

NODE.JS
- Version 18.0 or higher
- Download from: https://nodejs.org/
- Verify with: node --version

NPM (comes with Node.js) or BUN
- npm version 9+ or Bun 1.0+
- Verify npm: npm --version
- Or install Bun: curl -fsSL https://bun.sh/install | bash

GIT
- For cloning the repository
- Download from: https://git-scm.com/
- Verify with: git --version

A CODE EDITOR (Recommended)
- VS Code with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

================================================================================
5. INSTALLATION & SETUP
================================================================================

STEP 1: CLONE THE REPOSITORY
-------------------------------------------------------------------------------
Open your terminal and run:

git clone https://github.com/saksham17-tech/Playroom---A-Universal-Video-Player.git
cd Playroom---A-Universal-Video-Player

STEP 2: INSTALL DEPENDENCIES
-------------------------------------------------------------------------------
Using npm (recommended):
npm install

Using Bun (alternative):
bun install

STEP 4: START DEVELOPMENT SERVER
-------------------------------------------------------------------------------
npm run dev

Or with Bun:
bun run dev

The application will start on http://localhost:5173 (or a different port if 5173 is busy).

STEP 5: VERIFY INSTALLATION
-------------------------------------------------------------------------------
Open http://localhost:5173 in your browser. You should see the Playroom video player interface.

================================================================================
6. PROJECT STRUCTURE
================================================================================

Playroom---A-Universal-Video-Player/
├── public/                      # Static assets
│   ├── favicon.ico             # Browser favicon
│   └── videos/                 # Sample videos (optional)
├── src/                         # Source code
│   ├── components/             # React components
│   │   ├── Player/            # Video player components
│   │   │   ├── VideoPlayer.tsx      # Main player component
│   │   │   ├── Controls.tsx         # Playback controls
│   │   │   ├── AspectRatio.tsx      # IMAX 1.43:1 handling
│   │   │   └── index.ts             # Component exports
│   │   ├── UI/                # Reusable UI elements
│   │   │   ├── Button.tsx
│   │   │   ├── Slider.tsx
│   │   │   └── Icons.tsx
│   │   └── Layout/            # Layout components
│   │       ├── Header.tsx
│   │       └── Footer.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useVideoPlayer.ts   # Video playback logic
│   │   └── useKeyboardShortcuts.ts
│   ├── utils/                  # Utility functions
│   │   ├── videoUtils.ts      # Video format helpers
│   │   ├── aspectRatio.ts     # IMAX 1.43:1 calculations
│   │   └── constants.ts       # App constants
│   ├── types/                  # TypeScript type definitions
│   │   └── video.d.ts
│   ├── styles/                 # Global styles
│   │   └── globals.css
│   ├── routes/                 # TanStack Start routes
│   │   ├── index.tsx          # Home route
│   │   └── player.tsx         # Player route
│   ├── App.tsx                 # Main App component
│   └── main.tsx               # Application entry point
├── .gitignore                   # Git ignore file
├── .prettierrc                  # Prettier configuration
├── .eslintrc.js                # ESLint configuration
├── components.json             # Component library config
├── bunfig.toml                 # Bun configuration
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
└── README.md                   # This file

================================================================================
7. DEVELOPMENT WORKFLOW
================================================================================

COMMON SCRIPTS
-------------------------------------------------------------------------------
npm run dev         # Start development server with hot reload
npm run build       # Build for production
npm run preview     # Preview production build locally
npm run lint        # Run ESLint
npm run format      # Run Prettier
npm run test        # Run tests (if configured)

DEVELOPMENT TIPS
-------------------------------------------------------------------------------
1. Hot Reload: Changes to components/UI update automatically in the browser.
2. Browser DevTools: Use React DevTools and Redux/Query DevTools for debugging.
3. TypeScript: Type checking runs in real-time. Fix errors before committing.
4. Tailwind: Classes auto-complete in VS Code with the Tailwind extension.
5. Video Test Files: Place sample videos in public/videos/ for testing.

KEYBOARD SHORTCUTS (in development)
-------------------------------------------------------------------------------
Spacebar     - Play/Pause
F            - Fullscreen toggle
M            - Mute/Unmute
Left/Right   - Seek backward/forward 5 seconds
Up/Down      - Volume up/down
Esc          - Exit fullscreen

================================================================================
8. BUILDING FOR PRODUCTION
================================================================================

STEP 1: OPTIMIZE FOR BUILD
-------------------------------------------------------------------------------
- Ensure all TypeScript errors are fixed
- Run linting: npm run lint
- Update version in package.json (optional)

STEP 2: BUILD THE APPLICATION
-------------------------------------------------------------------------------
npm run build

This creates a `dist/` folder with optimized static files:
- HTML, CSS, and JavaScript minified
- Assets hashed for cache busting
- Tree-shaken dependencies

STEP 3: PREVIEW THE BUILD
-------------------------------------------------------------------------------
npm run preview

This serves the production build locally at http://localhost:4173 for testing.

STEP 4: ANALYZE BUNDLE SIZE (Optional)
-------------------------------------------------------------------------------
Add to package.json:
"scripts": {
  "analyze": "vite build --mode analyze"
}
================================================================================
9. BROWSER SUPPORT
================================================================================

DESKTOP BROWSERS
-------------------------------------------------------------------------------
✅ Chrome 88+          - Full support
✅ Firefox 85+         - Full support
✅ Edge 88+            - Full support
✅ Safari 14+          - Full support (macOS)
⚠️ Opera 74+           - Most features supported
❌ Internet Explorer   - Not supported

MOBILE BROWSERS
-------------------------------------------------------------------------------
✅ Chrome Android 88+  - Full support
✅ Safari iOS 14+      - Full support
✅ Samsung Internet 14+ - Full support
✅ Firefox Android 85+ - Full support

VIDEO FORMAT SUPPORT BY BROWSER
-------------------------------------------------------------------------------
Format     Chrome  Firefox  Safari  Edge   iOS Safari
--------   ------  -------  ------  ----   ----------
MP4/H.264  ✅      ✅       ✅      ✅     ✅
WebM/VP8   ✅      ✅       ❌      ✅     ❌
WebM/VP9   ✅      ✅       ❌      ✅     ❌
OGG        ✅      ✅       ❌      ✅     ❌
HEVC/H.265 ⚠️      ❌       ✅      ⚠️     ✅

LEGEND: ✅ Full Support | ⚠️ Partial Support | ❌ Not Supported

================================================================================
10. CONTRIBUTING
================================================================================

We welcome contributions from the community! Here's how you can help:

WAYS TO CONTRIBUTE
-------------------------------------------------------------------------------
1. Report bugs via GitHub Issues
2. Suggest new features
3. Submit pull requests for bug fixes or improvements
4. Improve documentation
5. Share the project on social media

DEVELOPMENT WORKFLOW FOR CONTRIBUTORS
-------------------------------------------------------------------------------
1. Fork the repository on GitHub
2. Clone your fork: git clone https://github.com/YOUR_USERNAME/Playroom.git
3. Create a new branch: git checkout -b feature/your-feature-name
4. Make your changes
5. Test your changes: npm run dev
6. Format code: npm run format
7. Lint code: npm run lint
8. Commit with clear message: git commit -m "Add: your feature description"
9. Push to your fork: git push origin feature/your-feature-name
10. Open a Pull Request on the main repository

CODING STANDARDS
-------------------------------------------------------------------------------
- Use TypeScript (strict mode)
- Follow React hooks best practices
- Write meaningful component and function names
- Add JSDoc comments for complex functions
- Keep components focused and single-purpose
- Use Tailwind classes for styling
- Ensure responsive design for all screen sizes

================================================================================
11. LICENSE
================================================================================

This project is open source and available under the MIT License.

MIT License

Copyright (c) 2026 saksham17-tech

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

================================================================================
15. CONTACT & SUPPORT
================================================================================

GITHUB
-------------------------------------------------------------------------------
Repository: https://github.com/saksham17-tech/Playroom---A-Universal-Video-Player
Issues: https://github.com/saksham17-tech/Playroom---A-Universal-Video-Player/issues

SUPPORT OPTIONS
-------------------------------------------------------------------------------
1. Check existing GitHub Issues for solutions
2. Open a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Browser and OS information
   - Screenshots if applicable
3. For urgent help: mention @saksham17-tech in the issue

FEATURE REQUESTS
-------------------------------------------------------------------------------
Please use GitHub Issues with the "enhancement" label.

================================================================================
ADDITIONAL RESOURCES
================================================================================

- React Documentation: https://react.dev
- TypeScript Documentation: https://www.typescriptlang.org
- TanStack Start: https://tanstack.com/start
- Tailwind CSS: https://tailwindcss.com
- Vite: https://vitejs.dev
- IMAX Aspect Ratio Guide: https://en.wikipedia.org/wiki/IMAX

================================================================================
CHANGELOG
================================================================================

Version 1.0.0 (August 9, 2026)
- Initial release
- Basic video player functionality
- IMAX 1.43:1 aspect ratio support
- Responsive UI with Tailwind CSS
- Keyboard shortcuts
- Dark/light theme support

================================================================================
END OF README
================================================================================
