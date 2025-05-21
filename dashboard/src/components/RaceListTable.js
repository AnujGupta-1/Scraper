import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
  TablePagination, TextField, MenuItem, Alert, Box, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { fetchRaceList } from '../api/api';

export default function RaceListTable({ onRaceSelect }) {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(dayjs());
  const [trackFilter, setTrackFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');

  // Fetch data for the selected date
  const loadData = () => {
    setLoading(true);
    setError('');
    fetchRaceList(date.format('YYYY-MM-DD'))
      .then(data => {
        setAllRows(data);
        setRows(data);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setAllRows([]);
        setLoading(false);
        setError('Failed to load race list. (API or CSV missing)');
      });
  };

  // Initial fetch and on date change
  useEffect(() => {
    loadData();
    setPage(0);
    // eslint-disable-next-line
  }, [date]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [date]);

  // Filter rows by selected track
  useEffect(() => {
    if (!trackFilter) {
      setRows(allRows);
    } else {
      setRows(allRows.filter(r => r.track === trackFilter));
    }
    setPage(0);
  }, [trackFilter, allRows]);

  const uniqueTracks = [...new Set(allRows.map(r => r.track))];

  // Pagination
  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Greyhound Races</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <DatePicker
          label="Pick a date"
          value={date}
          onChange={val => setDate(val)}
        />
        <TextField
          select
          label="Track"
          value={trackFilter}
          onChange={e => setTrackFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All Tracks</MenuItem>
          {uniqueTracks.map(track => (
            <MenuItem key={track} value={track}>{track}</MenuItem>
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
                <TableCell>Track</TableCell>
                <TableCell>Race #</TableCell>
                <TableCell>Start Time</TableCell>
                <TableCell>Race URL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">No races found for this selection.</TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, i) => (
                  <TableRow
                    key={i}
                    hover
                    style={{ cursor: onRaceSelect ? 'pointer' : undefined }}
                    onClick={() => onRaceSelect && onRaceSelect({ ...row, date: date.format('YYYY-MM-DD') })}
                  >
                    <TableCell>{row.track}</TableCell>
                    <TableCell>{row.raceNumber}</TableCell>
                    <TableCell>{row.startTime}</TableCell>
                    <TableCell>
                      <a href={row.raceURL} target="_blank" rel="noopener noreferrer">Link</a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={rows.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => setRowsPerPage(parseInt(e.target.value, 10))}
            rowsPerPageOptions={[5, 10, 25]}
          />
        </TableContainer>
      )}
    </Box>
  );
}
