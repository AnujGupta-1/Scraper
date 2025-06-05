import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, TableRow, TableCell,
  CircularProgress, Alert, TextField, MenuItem, TablePagination
} from '@mui/material';
import dayjs from 'dayjs';
import { fetchMergedRaceDetails } from '../api/api';

export default function MergedOddsTable() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [rows, setRows] = useState([]);
  const [snapshotTimes, setSnapshotTimes] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const loadMergedOdds = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMergedRaceDetails(date);
      setRows(data);
      const uniqueTimes = [...new Set(data.map(r => r.snapshotTime))];
      setSnapshotTimes(uniqueTimes);
      setSelectedSnapshot(uniqueTimes[0] || '');
    } catch {
      setError('Failed to load merged odds.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMergedOdds();
  }, [date]);

  useEffect(() => {
    setPage(0); // reset to first page on snapshot change
  }, [selectedSnapshot]);

  const filteredRows = selectedSnapshot
    ? rows.filter(r => r.snapshotTime === selectedSnapshot)
    : rows;

  const paginatedRows = filteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Merged Odds by Snapshot — {date}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField
          label="Pick a date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Snapshot Time"
          value={selectedSnapshot}
          onChange={e => setSelectedSnapshot(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {snapshotTimes.map(time => (
            <MenuItem key={time} value={time}>{time}</MenuItem>
          ))}
        </TextField>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Track</TableCell>
                <TableCell>Race</TableCell>
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
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No data found for this snapshot.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.track}</TableCell>
                    <TableCell>{row.raceNumber}</TableCell>
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

          {/* Pagination Footer */}
          <TablePagination
            component="div"
            count={filteredRows.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[rowsPerPage]}
          />
        </Paper>
      )}
    </Box>
  );
}
