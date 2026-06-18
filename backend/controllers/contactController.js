const { sendContactFormEmailSafe } = require('../utils/emailService');
const { warn } = require('../utils/logger');

// POST /api/contact
const submitContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    try {
      await sendContactFormEmailSafe({ name, email, phone, message });
    } catch (emailError) {
      warn('contact_submit_email_failed', { email, error: emailError.message });
      return res.status(502).json({
        message: 'We could not send your message right now. Please try again in a moment.',
      });
    }

    res.json({ message: 'Thank you! Your message has been sent. We will get back to you soon.' });
  } catch (error) {
    console.error('Contact form error:', error.message);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

module.exports = { submitContact };
