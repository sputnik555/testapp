import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, Box } from '@mui/material';
import StartPage from './components/StartPage';
import ChatRoom from './components/ChatRoom';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [sessionCode, setSessionCode] = useState(null);
  const [socket, setSocket] = useState(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ height: '100vh', py: 4 }}>
          {!sessionCode ? (
            <StartPage setSessionCode={setSessionCode} setSocket={setSocket} />
          ) : (
            <ChatRoom
              sessionCode={sessionCode}
              socket={socket}
              onLeave={() => {
                setSessionCode(null);
                setSocket(null);
              }}
            />
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default App;
