# Setup & Running Guide: Nova MRP System

Welcome! This guide will walk you through setting up and running the Nova Material Requirements Planning (MRP) application. It is written in simple steps so anyone can follow along and run it on their computer.

---

## 📋 Prerequisites

Before running the application, you need to download and install two free tools on your computer:

1. **Python (version 3.9 or higher)**:
   - Used to run the backend server and handle the database.
   - Download it here: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - **⚠️ IMPORTANT**: During installation on Windows, make sure to check the box that says **"Add Python to PATH"**.

2. **Node.js (version 18 or higher)**:
   - Used to run the frontend web interface.
   - Download it here: [https://nodejs.org/](https://nodejs.org/) (Choose the **LTS** version).

---

## 🚀 Step-by-Step Setup

### Step 1: Set Up the Backend Server

The backend server manages the database, calculations, and APIs.

1. Open your terminal or Command Prompt (search for `cmd` or `PowerShell` in the Windows Start menu).
2. Go to the project directory:
   ```bash
   cd "C:\Users\admin\OneDrive\Desktop\final PMS"
   ```
3. Enter the `backend` folder:
   ```bash
   cd backend
   ```
<!-- 4. Create a virtual environment (this keeps the installation clean and isolated):
   ```bash
   python -m venv venv
   ```
5. Activate the virtual environment:
   - **On Windows (Command Prompt)**:
     ```cmd
     venv\Scripts\activate.bat
     ```
   - **On Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - *You will know it is active because `(venv)` will appear at the start of your command line.*
6. Install all required dependencies (using the requirements file): -->
   ```bash
   
   pip install -r requirements.txt
   ```
7. Start the backend Flask server:
   ```bash
   python app.py
   ```
   - *Keep this terminal window open! The backend server runs at `http://localhost:5000`.*

---

### Step 2: Set Up the Frontend Interface

The frontend is the visual website you interact with.

1. Open a **new, second** terminal or Command Prompt window (do not close the backend one!).
2. Go to the project directory:
   ```bash
   cd "C:\Users\admin\OneDrive\Desktop\final PMS"
   ```
3. Enter the `frontend` folder:
   ```bash
   cd frontend
   ```
4. Install the package dependencies (this downloads the website requirements):
   ```bash
   npm install
   ```
5. Start the frontend development website:
   ```bash
   npm run dev
   ```
   - *This will start the local website. Keep this terminal open as well!*

---

## 💻 Accessing the Application

Once both servers are running, open your web browser (Chrome, Edge, or Safari) and go to:
👉 **[http://localhost:3000](http://localhost:3000)**

### Login Accounts
You can log in using these mock credentials to explore the system:

* **Admin Role** (Full access: edit/delete data bulk editor, seed/clear data):
  * **Username**: `admin`
  * **Password**: `admin123`

* **Viewer Role** (Read-only access, cannot save excel changes):
  * **Username**: `viewer`
  * **Password**: `viewer123`

---

## 🛠️ Troubleshooting

* **"Python is not recognized as an internal or external command"**:
  - This means Python wasn't added to your system's PATH during installation. Re-run the Python installer, select "Modify", and make sure **"Add Python to PATH"** is checked.
* **Ports already in use (5000 or 3000)**:
  - Close any other running servers or applications, or restart your Command Prompt and run the commands again.
