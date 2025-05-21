import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography,
  TablePagination, TextField, MenuItem, Alert, Box, CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { fetchResults } from '../api/api';

export default function ResultsTable() {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(dayjs());
  const [trackFilter, setTrackFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');

  // Load data for selected date
  const loadData = () => {
    setLoading(true);
    setError('');
    fetchResults(date.format('YYYY-MM-DD'))
      .then(data => {
        setAllRows(data);
        setRows(data);
        setLoading(false);
      })
      .catch(() => {
        setRows([]);
        setAllRows([]);
        setLoading(false);
        setError('Failed to load results. (API or CSV missing)');
      });
  };

  useEffect(() => {
    loadData();
    setPage(0);
  }, [date]);

  useEffect(() => {
    const interval = setInterval(() => loadData(), 60000); // 60s auto-refresh
    return () => clearInterval(interval);
  }, [date]);

  useEffect(() => {
    if (!trackFilter) {
      setRows(allRows);
    } else {
      setRows(allRows.filter(r => r.track === trackFilter));
    }
    setPage(0);
  }, [trackFilter, allRows]);

  const uniqueTracks = [...new Set(allRows.map(r => r.track))];
  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Race Results</Typography>

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
                <TableCell>Race</TableCell>
                <TableCell>Place</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Time</TableCell>
                {/* Add more cells if your CSV has more columns */}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">No results found for this selection.</TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.track}</TableCell>
                    <TableCell>{row.race}</TableCell>
                    <TableCell>{row.place}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.time}</TableCell>
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
