const Message = require('../models/Message');
const Customer = require('../models/Customer');

// POST /api/messages - send a message (auth required)
// Body: { recipientId, subject, body }
// Sender: current user. Admins can send to any user; regular users can send to any user.
const sendMessage = async (req, res) => {
  try {
    const { recipientId, subject, body } = req.body;
    const senderId = req.user._id.toString();

    if (!recipientId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'recipientId, subject, and body are required',
      });
    }

    const recipient = await Customer.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found',
      });
    }

    const message = new Message({
      senderId,
      recipientId: recipientId.toString(),
      subject: subject.trim(),
      body: body.trim(),
    });
    await message.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      id: message._id,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send message',
    });
  }
};

// GET /api/messages - get messages for current user (auth required)
// Returns messages where current user is recipient, sorted by newest first
const getMyMessages = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const messages = await Message.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Populate sender info (username only)
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await Customer.find({ _id: { $in: senderIds } })
      .select('_id username first_name last_name')
      .lean();

    const senderMap = Object.fromEntries(senders.map((s) => [s._id.toString(), s]));

    const items = messages.map((m) => ({
      id: m._id,
      senderId: m.senderId,
      senderName:
        senderMap[m.senderId]?.username ||
        [senderMap[m.senderId]?.first_name, senderMap[m.senderId]?.last_name].filter(Boolean).join(' ') ||
        'Unknown',
      recipientId: m.recipientId,
      subject: m.subject,
      body: m.body,
      read: m.read,
      createdAt: m.createdAt,
    }));

    res.json({ success: true, items });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load messages',
    });
  }
};

// DELETE /api/messages/:id - delete a message (auth required, recipient only)
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.recipientId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Message.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete message',
    });
  }
};

// PATCH /api/messages/:id/read - mark message as read (auth required)
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.recipientId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    message.read = true;
    await message.save();

    res.json({ success: true, read: true });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update message',
    });
  }
};

module.exports = {
  sendMessage,
  getMyMessages,
  markAsRead,
  deleteMessage,
};
