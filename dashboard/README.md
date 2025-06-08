# Greyhound Scraper Dashboard (Frontend)

This is the **React.js** frontend for the Greyhound Race Scraper project.

## 📚 Features

* View greyhound race lists, race results, and odds snapshots.
* Date picker to select specific race days.
* Track filtering and odds snapshot selection.
* Manual scrape trigger and scheduler status.
* Responsive dashboard design using **Material-UI (MUI)**.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm start
```

Runs on [http://localhost:3000](http://localhost:3000).

**Note:** Ensure the backend API server is running on [http://localhost:4000](http://localhost:4000).

---

## 🛠️ Tech Stack

* **React.js** — Frontend framework
* **Material-UI (MUI)** — UI Component library
* **Day.js** — Lightweight date library
* **Fetch API** — For API communication

---

## 🗓️ Main Components

* **RaceListTable** — Displays list of races with filtering and pagination.
* **RaceDetailsTable** — Displays race details and odds snapshots.
* **ResultsTable** — Displays race results.
* **MergedOddsTable** — Displays merged odds snapshots.
* **SchedulerStatus** — Shows the current scheduler status.
* **TriggerScrapeButton** — Button to trigger manual scraping.
* **NavBar** — Navigation bar for page switching.

---

## 📅 Notes

* Backend API server is required for dashboard to function.
* Data is loaded based on the selected date from the `exports/YYYY-MM-DD/` folders.
* The dashboard auto-refreshes data every 60 seconds.

---

## 🧑‍💻 Author

* Developed by **Anuj Gupta**
