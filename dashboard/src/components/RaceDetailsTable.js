import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Alert, Box, CircularProgress
} from '@mui/material';
import { fetchRaceDetails } from '../api/api';

export default function RaceDetailsTable({ selectedRace }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper: Load data for the selected race's date (if provided)
  const loadData = () => {
    if (!selectedRace) return;
    setLoading(true);
    setError('');
    fetchRaceDetails(selectedRace.date)
      .then(data => {
        setRows(data);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setLoading(false);
        setError('Failed to load race details.');
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [selectedRace]);

  // Auto-refresh every 60s (when race is selected)
  useEffect(() => {
    if (!selectedRace) return;
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [selectedRace]);

  if (!selectedRace)
    return <Typography sx={{ mt: 4 }}>Select a race above to view odds details.</Typography>;

  // Filter for only the selected race (track and raceNumber)
  const filteredRows = rows.filter(
    row => row.track === selectedRace.track && row.raceNumber === selectedRace.raceNumber
  );

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Race Details (Odds) — {selectedRace.track} Race {selectedRace.raceNumber}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Runner</TableCell>
                <TableCell>Bet Type</TableCell>
                <TableCell>Bet365</TableCell>
                <TableCell>Sportsbet</TableCell>
                <TableCell>Ladbrokes</TableCell>
                {/* Add/remove columns as needed for your CSV */}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No details found for this race.</TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.runnerName}</TableCell>
                    <TableCell>{row.betType}</TableCell>
                    <TableCell>{row.bet365}</TableCell>
                    <TableCell>{row.sportsbet}</TableCell>
                    <TableCell>{row.ladbrokes}</TableCell>
                    {/* Add/remove columns as needed */}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
