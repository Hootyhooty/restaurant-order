// src/components/Store.jsx
// Store page - displays souvenir items (same card layout as meals)
import { useState, useEffect } from 'react';
import './Store.css';
import SouvenirCard from './SouvenirCard';
import { API_BASE } from '../apiConfig';

const Store = () => {
  const [souvenirs, setSouvenirs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSouvenirs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/souvenirs`);
        if (!res.ok) throw new Error('Failed to load souvenirs');
        const data = await res.json();
        setSouvenirs(data.items || []);
      } catch (err) {
        console.error('Store fetch error:', err);
        setError(err.message || 'Error loading store');
      } finally {
        setLoading(false);
      }
    };
    fetchSouvenirs();
  }, []);

  if (loading) {
    return (
      <section className="store-section">
        <div className="container">
          <div className="store-header">
            <h1 className="store-title">Stores</h1>
            <p className="store-subtitle">Souvenirs & merchandise</p>
          </div>
          <div className="store-loading">Loading...</div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="store-section">
        <div className="container">
          <div className="store-header">
            <h1 className="store-title">Stores</h1>
          </div>
          <div className="store-error">Error: {error}</div>
        </div>
      </section>
    );
  }

  return (
    <section className="store-section">
      <div className="container">
        <div className="store-header">
          <h1 className="store-title">Stores</h1>
          <p className="store-subtitle">Souvenirs & merchandise</p>
        </div>
        {souvenirs.length === 0 ? (
          <p className="store-empty">-- no item for sell at the moment --</p>
        ) : (
          <div className="store-grid">
            {souvenirs.map((item) => (
              <SouvenirCard key={item.id} souvenir={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Store;
