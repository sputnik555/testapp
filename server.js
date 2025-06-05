const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const CyrillicToTranslit = require('cyrillic-to-translit-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "*",
    methods: ["GET", "POST"]
  }
});

// Инициализация транслитерации
const translit = new CyrillicToTranslit();

// Константы
const SESSION_TIMEOUT = 3 * 60 * 60 * 1000; // 3 часа в миллисекундах
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Проверка каждые 5 минут

// Настройка CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "*"
}));
app.use(express.json());

// Настройка хранилища для загруженных файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    
    // Сначала транслитерация, потом очистка от не-латинских символов
    const transliteratedName = translit.transform(name);
    const safeName = transliteratedName.replace(/[^a-zA-Z0-9_\.]/g, '_');
    const timestamp = Date.now();
    const finalName = `${timestamp}-${safeName}${ext}`;
    
    cb(null, finalName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB
  }
});

// Хранение активных сессий
const sessions = new Map();

// Создание директории для загрузок
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// В продакшене раздаем статические файлы из build директории
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Генерация кода сессии
function generateSessionCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Функция для форматирования даты
function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Функция для очистки файлов сессии
function cleanupSessionFiles(session) {
  if (session && session.files) {
    session.files.forEach(file => {
      const filePath = path.join(__dirname, 'uploads', file.filename);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Файл удален: ${filePath}`);
        }
      } catch (error) {
        console.error(`Ошибка при удалении файла ${file.filename}:`, error);
      }
    });
  }
}

// Функция для обновления времени последней активности сессии
function updateSessionActivity(sessionCode) {
  const session = sessions.get(sessionCode);
  if (session) {
    session.lastActivity = Date.now();
  }
}

// Функция для проверки и очистки неактивных сессий
function cleanupInactiveSessions() {
  const now = Date.now();
  sessions.forEach((session, code) => {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`Сессия ${code} автоматически закрыта из-за неактивности`);
      cleanupSessionFiles(session);
      sessions.delete(code);
    }
  });
}

// Запуск периодической проверки неактивных сессий
setInterval(cleanupInactiveSessions, CLEANUP_INTERVAL);

// Обработка подключений Socket.IO
io.on('connection', (socket) => {
  console.log('Новое подключение:', socket.id);

  socket.on('createSession', () => {
    const sessionCode = generateSessionCode();
    sessions.set(sessionCode, {
      users: [socket.id],
      messages: [],
      files: [],
      lastActivity: Date.now()
    });
    socket.join(sessionCode);
    socket.emit('sessionCreated', sessionCode);
  });

  socket.on('joinSession', (sessionCode) => {
    const session = sessions.get(sessionCode);
    if (session && session.users.length < 2) {
      session.users.push(socket.id);
      socket.join(sessionCode);
      socket.emit('sessionJoined', sessionCode);
      // Отправляем историю сообщений и файлов новому пользователю
      socket.emit('messageHistory', session.messages.map(msg => ({
        ...msg,
        formattedDate: formatDate(msg.timestamp)
      })));
      socket.emit('fileHistory', session.files);
      io.to(sessionCode).emit('userJoined', socket.id);
      updateSessionActivity(sessionCode);
    } else {
      socket.emit('error', 'Сессия не найдена или уже заполнена');
    }
  });

  socket.on('sendMessage', (data) => {
    const { sessionCode, message } = data;
    const session = sessions.get(sessionCode);
    if (session) {
      const newMessage = {
        id: uuidv4(),
        text: message,
        sender: socket.id,
        timestamp: new Date(),
        formattedDate: formatDate(new Date())
      };
      session.messages.push(newMessage);
      io.to(sessionCode).emit('newMessage', newMessage);
      updateSessionActivity(sessionCode);
    }
  });

  socket.on('fileUploaded', (data) => {
    const { sessionCode, fileData } = data;
    const session = sessions.get(sessionCode);
    if (session) {
      session.files.push(fileData);
      io.to(sessionCode).emit('newFile', {
        ...fileData,
        timestamp: new Date(),
        formattedDate: formatDate(new Date())
      });
      updateSessionActivity(sessionCode);
    }
  });

  socket.on('disconnect', () => {
    sessions.forEach((session, code) => {
      if (session.users.includes(socket.id)) {
        session.users = session.users.filter(id => id !== socket.id);
        if (session.users.length === 0) {
          // Очищаем файлы при закрытии сессии
          cleanupSessionFiles(session);
          sessions.delete(code);
          console.log(`Сессия ${code} закрыта, файлы удалены`);
        } else {
          io.to(code).emit('userLeft', socket.id);
        }
      }
    });
  });
});

// Маршрут для загрузки файлов
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('Файл не был загружен');
  }
  res.json({
    filename: req.file.filename,
    size: req.file.size
  });
});

// Маршрут для скачивания файлов
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  res.download(filepath);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 