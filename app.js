require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
//add punlic folder static
app.use(express.static(__dirname + '/public'));

mongoose.connect(process.env.MONGODB_URI||'mongodb://localhost:27017/locationtracker').then(() => {
    console.log('Connected to MongoDB');
})
const locationSchema = new mongoose.Schema({
  username: String,
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now }
});
const Location = mongoose.model('Location', locationSchema);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('startLocation', (data) => {
    console.log(`User ${data.username} started sharing location`);
  });

  socket.on('updateLocation',async (data) => {
    console.log(`Updating location for User ${data.username}: ${data.latitude}, ${data.longitude}`);

    // Save the location to MongoDB
    const user = await Location.findOne({ username: data.username });
    if (!user) {
        const location = new Location({
            username: data.username,
            latitude: data.latitude,
            longitude: data.longitude
          });
          location.save();
    }else{
        user.latitude = data.latitude;
        user.longitude = data.longitude;
        user.save();
    }
    

    // Broadcast the updated location to all connected clients
    io.emit('locationUpdate', {
      username: data.username,
      latitude: data.latitude,
      longitude: data.longitude
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
app.get('/', (req, res) => {
  res.redirect('/location.html');
})
app.get('/get-location/:username', async (req, res) => {
    try {
        const user = await Location.find({username: req.params.username});
        res.json(user);
    } catch (error) {
       res.status(400).json(error); 
    }

})

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
