// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { randomBytes } = require('crypto'); // Generate random ID
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
  // Return comments for a given post ID
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
  // Create comment
  const commentId = randomBytes(4).toString('hex'); // Generate random ID
  const { content } = req.body;

  const comments = commentsByPostId[req.params.id] || []; // Get comments for a given post ID
  comments.push({ id: commentId, content, status: 'pending' }); // Add new comment
  commentsByPostId[req.params.id] = comments; // Assign new comment to post ID

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  res.status(201).send(comments); // Send back comments
});

app.post('/events', async (req, res) => {
  // Receive events
  console.log('Event Received:', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    // Update comment
    const { postId, id, status, content } = data;
    const comments = commentsByPostId[postId];

    const comment = comments.find((comment) => {
      return comment.id === id;
    });

    comment.status = status; // Update comment status

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id, status, postId, content },
    });
  }

  res.send({});
});

app.listen(4001, () => {
  console.log('Listening on 4001');
});