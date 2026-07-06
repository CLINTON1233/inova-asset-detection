"# INOVA Asset Detection

Complete installation and usage guide for the INOVA Asset Detection project.

## Summary

This project includes:

- `backend/`: Flask API for asset detection, serial scanning, scan code processing, and asset data management.
- `frontend/`: Next.js app for the user interface.

When the system is running, it accepts asset images, processes detection, and saves asset data to the database. The detection results are also available in the `backend/static/results` folder and via the backend API.

## Prerequisites

Before installation, ensure your machine has:

- Git (optional, if you want to clone the repository)
- Python 3.11+ (recommended 3.11 or 3.12)
- Node.js 18+ / npm 9+ (Next.js 15)
- PostgreSQL 14+ or a compatible version
- `pip` for Python

## Project Structure

- `backend/` - Flask server code
- `backend/requirements.txt` - backend Python dependencies
- `frontend/` - Next.js application
- `frontend/package.json` - frontend scripts and dependencies
- `backend/models/` - YOLO models for asset detection
- `backend/static/results/` - detection output results
- `backend/uploads/` - upload folder

## Backend Setup

### 1. Change to the backend folder

```powershell
cd "c:\Users\DELL\Documents\Infra Applications\inova-asset-detection\backend"
```

### 2. Create a Python virtual environment

```powershell
python -m venv venv
```

### 3. Activate the virtual environment

```powershell
.\venv\Scripts\Activate
```

### 4. Install backend dependencies

```powershell
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Prepare PostgreSQL database

By default, the backend uses the following settings if `.env` is not provided:

- DB_HOST = localhost
- DB_NAME = inova
- DB_USER = postgres
- DB_PASSWORD = Sukses12345
- DB_PORT = 5432

If the database does not exist yet, create it:

```powershell
psql -U postgres -c "CREATE DATABASE inova;"
```

> If you use pgAdmin, create the `inova` database through the UI.

### 6. Create a `.env` file

In the `backend/` folder, create a `.env` file with:

```env
DB_HOST=localhost
DB_NAME=inova
DB_USER=postgres
DB_PASSWORD=Sukses12345
DB_PORT=5432
SECRET_KEY=your_secret_key_here
API_PORT=5001
```

If you want to change the backend port, update `API_PORT` in `.env`.

### 7. Run database migrations

```powershell
python run_migrations.py --action up
```

This command creates the required tables and inserts some master data like projects, devices, and materials.

### 8. Start the backend server

```powershell
python app.py
```

If successful, the backend will run at:

- http://localhost:5001/

Check the API endpoint:

- http://localhost:5001/api

If the backend responds successfully, the backend service is ready.

## Frontend Setup

### 1. Change to the frontend folder

```powershell
cd "c:\Users\DELL\Documents\Infra Applications\inova-asset-detection\frontend"
```

### 2. Install frontend dependencies

```powershell
npm install
```

### 3. Create `.env.local` (optional)

In the `frontend/` folder, create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

If you do not create this file, the frontend will default to `http://localhost:5001`.

### 4. Start the frontend

```powershell
npm run dev
```

The frontend will run at:

- http://localhost:3004/

## System Usage Flow

1. Open `http://localhost:3004` in your browser.
2. Login or register if prompted.
3. Create or select a scanning preparation if needed.
4. Use the scan menu to upload an asset photo or capture an image with the camera.
5. The system sends the image to the backend, processes detection, and saves asset data.
6. View detected assets in the `Assets`, `Reports`, or `Validation` pages in the frontend.

## How to Confirm Output is Working

### API output and asset data

- The backend returns JSON responses from API endpoints.
- The frontend displays asset results in `Assets`, `Reports`, and validation flows.
- YOLO detection output files are stored in:
  - `backend/static/results/`
- Uploaded scan photos are stored in:
  - `backend/uploads/scan_photos/`

### Check backend status

If the backend is running, open:

- http://localhost:5001/

You should see a message like `Welcome to INOVA API`.

### Check frontend-backend connection

Make sure the frontend is able to call the backend API.
If the frontend fails, check the browser console and verify `NEXT_PUBLIC_API_URL` is set correctly.

## Troubleshooting Tips

- If the backend fails due to database connection issues, make sure PostgreSQL is running and the credentials in `.env` are correct.
- If the backend port is already in use, change `API_PORT` in `.env` and update `NEXT_PUBLIC_API_URL` in `frontend/.env.local`.
- If you encounter CORS issues, verify that `app.py` allows `http://localhost:3004`.
- If Python package errors occur, confirm Python 3.11+ and reinstall dependencies.
- If Node/Next.js errors occur, confirm Node 18+.

## Important Commands

```powershell
# Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate
pip install -r requirements.txt
python run_migrations.py --action up
python app.py

# Frontend
cd ../frontend
npm install
npm run dev
```

## Important Notes

- Make sure the `backend/models/` folder contains YOLO model files (`best.pt`) for device, material, serial, and scan code detection.
- Ensure the connection between frontend (`http://localhost:3004`) and backend (`http://localhost:5001`) is not blocked by firewall rules.
- Use the admin account or any registered user account to log in.

Congratulations! Once the backend and frontend are running, you can use the system to detect assets and generate asset data.
"
