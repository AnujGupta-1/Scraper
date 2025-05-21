import React, { useState } from 'react';
import { Button, CircularProgress, Box, Alert } from '@mui/material';

export default function TriggerScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleTrigger = () => {
    setLoading(true);
    setMsg('');
    setErr('');
    fetch('http://localhost:4000/api/trigger-scrape', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setMsg(data.message || 'Manual scrape triggered!');
        setLoading(false);
      })
      .catch(() => {
        setErr('Failed to trigger manual scrape.');
        setLoading(false);
      });
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Button variant="contained" onClick={handleTrigger} disabled={loading}>
        Trigger Manual Scrape
      </Button>
      {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
    </Box>
  );
}
