import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Avatar,
  Tooltip,
  Fade,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  ExitToApp as ExitIcon,
} from '@mui/icons-material';
import axios from 'axios';

const ChatRoom = ({ sessionCode, socket, onLeave }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    socket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('newFile', (fileData) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: `Файл: ${fileData.filename}`,
        fileUrl: `http://localhost:5000/download/${fileData.filename}`,
        fileName: fileData.filename,
        timestamp: fileData.timestamp,
        formattedDate: fileData.formattedDate,
      }]);
    });

    socket.on('messageHistory', (history) => {
      setMessages(history);
    });

    socket.on('fileHistory', (files) => {
      const fileMessages = files.map(file => ({
        id: Date.now() + Math.random(),
        text: `Файл: ${file.filename}`,
        fileUrl: `http://localhost:5000/download/${file.filename}`,
        fileName: file.filename,
        timestamp: file.timestamp,
        formattedDate: file.formattedDate,
      }));
      setMessages(prev => [...prev, ...fileMessages]);
    });

    socket.on('userJoined', (userId) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: 'Пользователь присоединился к сессии',
          system: true,
          timestamp: new Date(),
          formattedDate: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
        },
      ]);
    });

    socket.on('userLeft', (userId) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: 'Пользователь покинул сессию',
          system: true,
          timestamp: new Date(),
          formattedDate: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
        },
      ]);
    });

    return () => {
      socket.off('newMessage');
      socket.off('newFile');
      socket.off('messageHistory');
      socket.off('fileHistory');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    socket.emit('sendMessage', {
      sessionCode,
      message: newMessage,
    });

    setNewMessage('');
  };

  // Простая функция транслитерации
  function transliterate(text) {
    const map = {
      А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g', Д: 'D', д: 'd',
      Е: 'E', е: 'e', Ё: 'E', ё: 'e', Ж: 'Zh', ж: 'zh', З: 'Z', з: 'z', И: 'I', и: 'i',
      Й: 'Y', й: 'y', К: 'K', к: 'k', Л: 'L', л: 'l', М: 'M', м: 'm', Н: 'N', н: 'n',
      О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r', С: 'S', с: 's', Т: 'T', т: 't',
      У: 'U', у: 'u', Ф: 'F', ф: 'f', Х: 'Kh', х: 'kh', Ц: 'Ts', ц: 'ts', Ч: 'Ch', ч: 'ch',
      Ш: 'Sh', ш: 'sh', Щ: 'Shch', щ: 'shch', Ъ: '', ъ: '', Ы: 'Y', ы: 'y', Ь: '', ь: '',
      Э: 'E', э: 'e', Ю: 'Yu', ю: 'yu', Я: 'Ya', я: 'ya'
    };
    return text.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Оригинальное имя файла:', file.name);
    const ext = file.name.substring(file.name.lastIndexOf('.'));
    const name = file.name.substring(0, file.name.lastIndexOf('.'));
    console.log('До транслитерации:', name);
    const translitName = transliterate(name);
    console.log('После транслитерации:', translitName);

    if (file.size > 500 * 1024 * 1024) {
      alert('Размер файла не должен превышать 500 МБ');
      return;
    }

    const safeName = translitName.replace(/[^a-zA-Z0-9_\.]/g, '_') + ext;
    const newFile = new File([file], safeName, { type: file.type });

    const formData = new FormData();
    formData.append('file', newFile);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData);
      const fileData = {
        filename: response.data.filename,
        size: response.data.size
      };
      
      socket.emit('fileUploaded', {
        sessionCode,
        fileData
      });
    } catch (error) {
      console.error('Ошибка при загрузке файла:', error);
      if (error.response?.status === 413) {
        alert('Размер файла не должен превышать 500 МБ');
      } else {
        alert('Ошибка при загрузке файла');
      }
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Fade in timeout={500}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper
          elevation={3}
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Сессия: {sessionCode}
          </Typography>
          <Tooltip title="Покинуть сессию">
            <IconButton onClick={onLeave} color="error">
              <ExitIcon />
            </IconButton>
          </Tooltip>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            flex: 1,
            mb: 2,
            overflow: 'auto',
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
          }}
        >
          <List>
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                <ListItem
                  sx={{
                    py: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: message.system
                        ? 'grey.500'
                        : message.sender === socket.id
                        ? 'primary.main'
                        : 'secondary.main',
                      mr: 2,
                    }}
                  >
                    {message.system ? '!' : message.sender === socket.id ? 'Я' : 'Он'}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography component="span">{message.text}</Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            ml: 2,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {message.formattedDate}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      message.fileUrl && (
                        <Button
                          href={message.fileUrl}
                          download={message.fileName}
                          variant="text"
                          size="small"
                          startIcon={<DownloadIcon />}
                          sx={{
                            mt: 1,
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'transparent',
                              color: 'primary.dark',
                            },
                          }}
                        >
                          Скачать файл
                        </Button>
                      )
                    }
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: message.system ? 'text.secondary' : 'text.primary',
                        fontWeight: message.system ? 'normal' : 'medium',
                      },
                    }}
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
            <div ref={messagesEndRef} />
          </List>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 2,
            borderRadius: 2,
            background: `linear-gradient(145deg, ${theme.palette.background.paper}, ${theme.palette.background.default})`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <Tooltip title="Прикрепить файл (макс. 500 МБ)">
              <IconButton
                color="primary"
                onClick={() => fileInputRef.current.click()}
                sx={{
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  transition: 'transform 0.2s',
                }}
              >
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Отправить сообщение">
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                sx={{
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                  transition: 'transform 0.2s',
                }}
              >
                <SendIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
};

export default ChatRoom; 