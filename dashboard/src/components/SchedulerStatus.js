import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import { fetchSchedulerStatus } from '../api/api';

export default function SchedulerStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStatus = () => {
    setLoading(true);
    setError('');
    fetchSchedulerStatus()
      .then(data => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch scheduler status.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadStatus(), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
  <Box sx={{ mt: 5 }}>
    <Card sx={{ maxWidth: 500 }}>
      <CardContent>
        <Typography variant="h6">Scheduler Status</Typography>
        {loading ? (
          <CircularProgress sx={{ mt: 2 }} />
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : (
          <>
            <Typography sx={{ mt: 2 }}>🟢 Status: {status?.running ? "Running" : "Idle"}</Typography>

            <Typography sx={{ mt: 2, fontWeight: 'bold' }}>Next Runs</Typography>
            <Typography>Race List: {status?.raceListNextRun || 'N/A'}</Typography>
            <Typography>Race Details: {status?.detailsNextRun || 'N/A'}</Typography>
            <Typography>Race Results: {status?.resultsNextRun || 'N/A'}</Typography>

            <Typography sx={{ mt: 2, fontWeight: 'bold' }}>Last Runs</Typography>
            <Typography>Race List: {status?.raceListLastRun || 'N/A'}</Typography>
            <Typography>Race Details: {status?.detailsLastRun || 'N/A'}</Typography>
            <Typography>Race Results: {status?.resultsLastRun || 'N/A'}</Typography>

            <Typography sx={{ mt: 2, fontWeight: 'bold' }}>Errors</Typography>
            <Typography>Race List: {status?.raceListLastError || 'None'}</Typography>
            <Typography>Race Details: {status?.detailsLastError || 'None'}</Typography>
            <Typography>Race Results: {status?.resultsLastError || 'None'}</Typography>
          </>
        )}
      </CardContent>
    </Card>
  </Box>
);
}
