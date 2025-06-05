import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Alert, TextField, MenuItem
} from '@mui/material';
import dayjs from 'dayjs';
import { fetchRaceDetails, fetchRaceFiles } from '../api/api';

export default function RaceDetailsTable({ selectedRace }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');

  const date = selectedRace?.date;

  const loadFiles = async () => {
    if (!date) return;
    try {
      const files = await fetchRaceFiles(date);
      setAvailableFiles(files);
      if (files.length > 0) setSelectedFile(files[0]); // default to first file
    } catch {
      setAvailableFiles([]);
    }
  };

  const loadData = async () => {
    if (!selectedRace || !selectedFile) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchRaceDetails(selectedRace.date, selectedFile);
      const filtered = data.filter(
        row => row.track === selectedRace.track && row.raceNumber === selectedRace.raceNumber
      );
      setRows(filtered);
    } catch {
      setError('Failed to load race details.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Load file list when date changes
  useEffect(() => {
    loadFiles();
  }, [date]);

  // Load odds when race or file changes
  useEffect(() => {
    loadData();
  }, [selectedRace, selectedFile]);

  if (!selectedRace)
    return <Typography sx={{ mt: 4 }}>Select a race above to view odds details.</Typography>;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Race Details (Odds) — {selectedRace.track} Race {selectedRace.raceNumber}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          select
          label="Odds Snapshot"
          value={selectedFile}
          onChange={e => setSelectedFile(e.target.value)}
          sx={{ minWidth: 300 }}
        >
          {availableFiles.map(file => (
            <MenuItem key={file} value={file}>{file}</MenuItem>
          ))}
        </TextField>
      </Box>

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
                <TableCell>Neds</TableCell>
                <TableCell>Pointsbet</TableCell>
                <TableCell>Betfair Back</TableCell>
                <TableCell>Betfair Lay</TableCell>
                <TableCell>Betr</TableCell>
                {/* Add more as needed */}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center">No details found for this race.</TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.runnerName}</TableCell>
                    <TableCell>{row.betType}</TableCell>
                    <TableCell>{row.bet365}</TableCell>
                    <TableCell>{row.sportsbet}</TableCell>
                    <TableCell>{row.ladbrokes}</TableCell>
                    <TableCell>{row.neds}</TableCell>
                    <TableCell>{row.pointsbet}</TableCell>
                    <TableCell>{row.betfair_back}</TableCell>
                    <TableCell>{row.betfair_lay}</TableCell>
                    <TableCell>{row.betr}</TableCell>
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
