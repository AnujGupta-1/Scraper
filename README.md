# Greyhound Race Scraper and Dashboard

This project consists of two parts:

* **Backend API Server** (Node.js + Express + Puppeteer) — for scraping greyhound race data and serving CSVs via API.
* **Frontend Dashboard** (React.js + MUI) — for visualizing race lists, race results, and betting odds snapshots.

---

## 📚 Features

* Scrapes **race list**, **race details** (odds.com.au/greyhound/), and **race results** from [The Greyhound Recorder](https://www.thegreyhoundrecorder.com.au/).
* Saves data locally under `./exports/YYYY-MM-DD/` folders.
* Full dashboard with:

  * 🏁 Race Lists
  * 📊 Race Details (Odds Snapshots)
  * 🏆 Race Results
  * 🔁 Scheduler Status & Manual Scrape Trigger
* Date-picker support — view any past date’s saved data.

---

## 📂 Folder Structure

```
root/
├── src/                    # Scraper scripts
├── exports/                 # CSV files saved by date (e.g., 2025-06-07/)
│    ├── greyhound-races.csv
│    ├── results.csv
│    ├── race-details-HH-MM.csv
├── logs/                    # Scraper logs
├── dashboard/               # React frontend
├── apiServer.js              # Express API Server
├── package.json              # Backend dependencies
└── README.md                 # This file
```

---

## 🚀 Getting Started

### 1. Backend API (Scraper Server)

#### Install Dependencies

```bash
npm install
```

#### Run API Server

```bash
node apiServer.js
```

Runs on [http://localhost:4000](http://localhost:4000).

### 2. Frontend Dashboard

Go to the `dashboard/` folder:

```bash
cd dashboard
npm install
npm start
```

Runs on [http://localhost:3000](http://localhost:3000).

---

## 👥 Dashboard Overview

* **Date Picker** — Select race date
* **Race List** — View scheduled races
* **Race Details** — View betting odds (Win / Place) per runner
* **Results** — View race results
* **Merged Odds** — View snapshots of odds over time
* **Scheduler Status** — See next/last run times and errors
* **Manual Scrape** — Manually trigger a scrape if needed

---

## 🛠️ API Endpoints

| Endpoint                                            | Method | Description                            |
| --------------------------------------------------- | ------ | -------------------------------------- |
| `/api/race-list?date=YYYY-MM-DD`                    | GET    | Get race list for the date             |
| `/api/results?date=YYYY-MM-DD`                      | GET    | Get race results for the date          |
| `/api/race-details-files?date=YYYY-MM-DD`           | GET    | List race-details CSVs for the date    |
| `/api/race-details?date=YYYY-MM-DD&file=<filename>` | GET    | Get race details for specific snapshot |
| `/api/race-details-merged?date=YYYY-MM-DD`          | GET    | Get merged odds data                   |
| `/api/scheduler-status`                             | GET    | Scheduler current status               |
| `/api/trigger-scrape`                               | POST   | Manually trigger scraping              |

---

## 🗓️ Data Storage

Each scrape saves CSVs inside the `./exports/YYYY-MM-DD/` folder:

* `greyhound-races.csv` — Race listing
* `results.csv` — Race results
* `race-details-HH-MM.csv` — Odds snapshot at scrape time (multiple per day)

---

## 📝 Notes

* Scraping is configured to run periodically using Node Cron.
* Puppeteer runs in stealth mode with headless browser.
* Make sure you have Chrome or Chromium installed for Puppeteer.
* Local timezone is set to **Australia/Brisbane (AEST)**.

---

## 🧑‍💻 Authors

* Developed by **Anuj Gupta**
* University of the Sunshine Coast — ICT342 Project
