import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import NavBar from './components/NavBar';
import RaceListTable from './components/RaceListTable';
import RaceDetailsTable from './components/RaceDetailsTable';
import ResultsTable from './components/ResultsTable';
import SchedulerStatus from './components/SchedulerStatus';
import TriggerScrapeButton from './components/TriggerScrapeButton';

function App() {
  const [page, setPage] = useState('overview');
  const [selectedRace, setSelectedRace] = useState(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <NavBar onNav={setPage} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <h2>Greyhound Scraper Dashboard</h2>

        {page === 'overview' && (
          <>
            <RaceListTable onRaceSelect={setSelectedRace} />
            <RaceDetailsTable selectedRace={selectedRace} />
            <ResultsTable />
            <TriggerScrapeButton />
            <SchedulerStatus />
          </>
        )}

        {page === 'races' && (
          <RaceListTable onRaceSelect={setSelectedRace} />
        )}

        {page === 'results' && <ResultsTable />}

        {page === 'scheduler' && (
          <>
            <TriggerScrapeButton />
            <SchedulerStatus />
          </>
        )}
      </div>
    </LocalizationProvider>
  );
}

export default App;
