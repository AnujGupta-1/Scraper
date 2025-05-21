import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';

export default function NavBar({ onNav }) {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Greyhound Scraper Dashboard
        </Typography>
        <Button color="inherit" onClick={() => onNav('overview')}>Overview</Button>
        <Button color="inherit" onClick={() => onNav('races')}>Races</Button>
        <Button color="inherit" onClick={() => onNav('results')}>Results</Button>
        <Button color="inherit" onClick={() => onNav('scheduler')}>Scheduler</Button>
      </Toolbar>
    </AppBar>
  );
}
