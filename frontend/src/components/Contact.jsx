import { useState } from 'react';
import { apiClient } from '../apiClient';
import { API_BASE } from '../apiConfig';
import './Contact.css';

const LOGO_URL =
  'https://res.cloudinary.com/dpfypv35h/image/upload/v1771868611/restaurant/food/food_img/Picha.png';
const RESTAURANT_PHONE = '+66 2 123 4567';
const WORKING_HOURS = '8:00 – 22:00';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSubmitting(true);
    try {
      const response = await apiClient.post(
        `${API_BASE}/api/contact`,
        { name: name.trim(), email: email.trim(), phone: phone.trim(), message: message.trim() },
        { headers: { 'Content-Type': 'application/json' } },
      );
      setSuccess(response.data?.message || 'Thank you! Your message has been sent.');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <div className="container contact-inner">
        <img src={LOGO_URL} alt="Picha" className="contact-logo" />

        <div className="contact-info-row">
          <a href={`tel:${RESTAURANT_PHONE.replace(/\s/g, '')}`} className="contact-info-chip">
            <span className="contact-info-label">Phone</span>
            <span className="contact-info-value">{RESTAURANT_PHONE}</span>
          </a>
          <div className="contact-info-chip">
            <span className="contact-info-label">Hours</span>
            <span className="contact-info-value">{WORKING_HOURS}</span>
          </div>
        </div>

        <h1 className="contact-title">Get in touch</h1>
        <p className="contact-subtitle">
          Questions, feedback, or a special request? Send us a message and we&rsquo;ll reply as soon
          as we can.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-field">
            <label htmlFor="contact-name">Full name</label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="contact-input"
            />
          </div>

          <div className="contact-field">
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="contact-input"
            />
          </div>

          <div className="contact-field">
            <label htmlFor="contact-phone">Phone number</label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="contact-input"
            />
          </div>

          <div className="contact-field">
            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
              required
              rows={5}
              className="contact-textarea"
            />
          </div>

          {error && <p className="contact-error">{error}</p>}
          {success && <p className="contact-success">{success}</p>}

          <div className="contact-submit-wrap">
            <button type="submit" className="btn btn-primary contact-submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Contact;
