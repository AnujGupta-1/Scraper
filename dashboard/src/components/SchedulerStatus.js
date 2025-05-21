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
      <Card sx={{ maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h6">Scheduler Status</Typography>
          {loading ? (
            <CircularProgress sx={{ mt: 2 }} />
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          ) : (
            <>
              <Typography>Status: {status?.running ? "Running" : "Idle"}</Typography>
              <Typography>Next Run: {status?.nextRun || 'N/A'}</Typography>
              <Typography>Last Error: {status?.lastError || 'None'}</Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
