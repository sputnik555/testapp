import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Container,
  Fade,
  Zoom,
  useTheme,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Link as LinkIcon } from '@mui/icons-material';
import io from 'socket.io-client';

const StartPage = ({ setSessionCode, setSocket }) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');
  const theme = useTheme();

  const handleCreateSession = () => {
    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      socket.emit('createSession');
    });

    socket.on('sessionCreated', (code) => {
      setSessionCode(code);
      setSocket(socket);
    });

    socket.on('error', (message) => {
      setError(message);
    });
  };

  const handleJoinSession = () => {
    if (!inputCode) {
      setError('Введите код сессии');
      return;
    }

    const socket = io('http://localhost:5000');
    socket.on('connect', () => {
      socket.emit('joinSession', inputCode);
    });

    socket.on('sessionJoined', (code) => {
      setSessionCode(code);
      setSocket(socket);
    });

    socket.on('error', (message) => {
      setError(message);
    });
  };

  return (
    <Container maxWidth="sm">
      <Fade in timeout={1000}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <Zoom in timeout={1000} style={{ transitionDelay: '500ms' }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
              }}
            >
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                align="center"
                sx={{
                  fontWeight: 'bold',
                  mb: 4,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Обмен файлами
              </Typography>

              <Typography
                variant="body1"
                gutterBottom
                align="center"
                sx={{ mb: 4, color: 'text.secondary' }}
              >
                Создайте новую сессию или присоединитесь к существующей
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    onClick={handleCreateSession}
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      boxShadow: 3,
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 6,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Создать новую сессию
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="body1"
                    align="center"
                    sx={{
                      my: 2,
                      color: 'text.secondary',
                      position: 'relative',
                      '&::before, &::after': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        width: '30%',
                        height: '1px',
                        backgroundColor: 'divider',
                      },
                      '&::before': {
                        left: 0,
                      },
                      '&::after': {
                        right: 0,
                      },
                    }}
                  >
                    или
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Код сессии"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    error={!!error}
                    helperText={error}
                    inputProps={{ maxLength: 5 }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    onClick={handleJoinSession}
                    startIcon={<LinkIcon />}
                    sx={{
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1.1rem',
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        transform: 'translateY(-2px)',
                        boxShadow: 3,
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Присоединиться к сессии
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Zoom>
        </Box>
      </Fade>
    </Container>
  );
};

export default StartPage; 