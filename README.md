# ContestHub 

ContestHub is a fully-featured, real-time Competitive Programming Platform built to host, manage, and participate in coding contests. It features secure anti-cheat mechanisms, real-time leaderboards, and a seamless developer experience powered by WebSockets.

##  Key Features

* **Real-time Leaderboards:** Instantly updated rankings powered by Socket.io.
* **Anti-Cheat System:** Built-in fullscreen enforcement and copy-paste prevention to maintain contest integrity.
* **Live Contest Management:** Organizers get a real-time admin dashboard to monitor participants, approve join requests, and view live status.
* **Secure Authentication:** JWT-based authentication with secure `httpOnly` cross-site cookies.
* **Responsive UI:** A modern, dark-themed UI built with Next.js and Tailwind CSS.
**Security and Attacks:** Proper protocols set up for XSS attacks, CSRF tokens, reverse proxy and load balancing.
* **Cloud Native:** Fully Dockerized architecture ready for deployment on Google Cloud Run.

##  Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
* **Backend:** Node.js, Express.js, TypeScript
* **Database:** PostgreSQL (Hosted on Neon)
* **Real-time Communication:** Socket.io
* **Deployment:** Docker, Google Cloud Run

##  Getting Started Locally

### Prerequisites
* Node.js 18+
* PostgreSQL database

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/contesthub.git
cd contesthub
```

### 2. Install Dependencies
This project uses a shared workspace approach. Install dependencies for both the frontend and backend:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Variables
Create a `.env` file in both the `backend` and `frontend` directories based on the required configurations.

**Backend (`backend/.env`):**
```env
PORT=4000
DATABASE_URL="postgresql://user:pass@host/db"
JWT_SECRET="your_jwt_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
COOKIE_SECRET="your_cookie_secret"
FRONTEND_URL="http://localhost:3000"
NODE_ENV="development"
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 4. Database Setup
Run the database migrations to set up your PostgreSQL schema:
```bash
cd backend
node run_migration_011.js
```

### 5. Run the Application
You can run both the frontend and backend concurrently from the root (if you have the root package.json set up), or run them in separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:4000`.

##  Deployment

ContestHub is designed to be easily deployed to Google Cloud Run using Docker.

1. **Deploy the Backend:**
```bash
cd backend
gcloud run deploy iship-backend --source . --region us-central1 --allow-unauthenticated --set-env-vars="NODE_ENV=production,FRONTEND_URL=your_frontend_url,DATABASE_URL=your_db_url,JWT_SECRET=your_secret,JWT_REFRESH_SECRET=your_refresh_secret,COOKIE_SECRET=your_cookie_secret"
```

2. **Deploy the Frontend:**
(Ensure your `.env.production` is correctly set with the Backend URL and pushed to the container).
```bash
cd frontend
gcloud run deploy iship-frontend --source . --region us-central1 --allow-unauthenticated
```

##  License
This project is licensed under the MIT License.
