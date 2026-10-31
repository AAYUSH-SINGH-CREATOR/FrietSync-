# FrietSync Frontend

> A modern, feature-rich project management and team collaboration web application (Jira / Linear / Slack hybrid) built with React, Vite, Tailwind CSS, and React Router.

---

## 🚀 Features

- **Authentication & Security**: Secure signup, login, OTP verification, password reset, and protected routes with token management.
- **Workspace & Dashboard**: Workspace creation and management, team views, profile management, and comprehensive overview analytics powered by Recharts.
- **Project Management**: Track projects with detailed timelines, project lists, and rich milestone tracking.
- **Issue Tracking**: Comprehensive issue boards and interactive **Dependency Graph Views** using `@xyflow/react`.
- **Sprint Planning**: Dedicated Sprints Board to plan, track, and manage team velocity and sprint cycles.
- **Real-Time Chat & Voice Calls**: Integrated chat features, chat polls, and WebRTC/Janus Gateway-powered voice calling support.
- **Interactive Polls**: Create and vote on polls within projects and chat discussions.
- **Calendar View**: Schedule and visualize deadlines, meetings, and sprint timelines.
- **Invite System**: Easily invite team members to workspaces via invite links and management screens.
- **Dark & Light Theme**: Fully supported dynamic theme switching.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Flow & Diagrams**: [@xyflow/react](https://reactflow.dev/)
- **Charts & Analytics**: [Recharts](https://recharts.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Real-time / Media**: [Janus Gateway](https://janus.conf.meetecho.com/)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)
- **Linting**: [ESLint](https://eslint.org/)

---

## 📂 Project Structure

```text
src/
├── assets/         # Images, logos, and static assets
├── components/     # Reusable layout and UI components (Navbar, Sidebar, Buttons, Modals)
├── context/        # Global context providers (ThemeContext, etc.)
├── features/       # Feature-based modular components and services
│   ├── auth/       # Authentication views and interceptors
│   ├── calendar/   # Calendar scheduling and views
│   ├── chat/       # Chat rooms, messaging, and voice integration
│   ├── dashboard/  # Workspace dashboard, overview, settings, team view
│   ├── invites/    # Workspace invitation handling
│   ├── issues/     # Issue tracking and dependency graphs
│   ├── polls/      # Poll creation, voting, and modals
│   ├── projects/   # Project management and timeline views
│   └── sprints/    # Sprint planning and boards
├── pages/          # Top-level pages (LandingPage, LegalPage)
├── services/       # API integration layers (workspaceApi, etc.)
└── utils/          # Helper utilities (error handler, voice call utils, formatters)
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have Node.js (v18+ recommended) and npm installed.

### Installation

1. Clone the repository or navigate to the project directory:
   ```bash
   cd frontend-restored
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory (refer to `.env.example`):
   ```env
   VITE_API_BASE_URL=your_backend_api_url
   ```

---

## 🏃 Running the Application

### Development Mode
Start the local Vite development server with Hot Module Replacement (HMR):
```bash
npm run dev
```

### Production Build
Build the application for production:
```bash
npm run build
```

### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

### Linting
Run ESLint to check for code quality and formatting issues:
```bash
npm run lint
```

---

## 📄 License

This project is private and proprietary.
