import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ChatWidget from '../components/ChatWidget/ChatWidget';
import AdminPanel from '../components/AdminPanel/AdminPanel';

// Minimal widget-only component for iframe embedding
function ChatWidgetOnly() {
  return <ChatWidget />;
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/widget" element={<ChatWidgetOnly />} />
          <Route path="/*" element={<ChatWidget />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
