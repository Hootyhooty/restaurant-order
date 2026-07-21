import { useEffect, useState } from 'react';
import { API_BASE } from '../apiConfig';
import { apiFetch } from '../apiClient';
import './Promotions.css';

const PLACEHOLDER_COVER = 'https://placehold.co/600x800/f8f4ec/c0892f?text=Picha+Promo';

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPromotions = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch(`${API_BASE}/api/promotions`);
        if (!res.ok) throw new Error('Failed to load promotions');
        const data = await res.json();
        setPromotions(data.items || []);
      } catch (err) {
        setError(err.message || 'Could not load promotions');
      } finally {
        setLoading(false);
      }
    };
    loadPromotions();
  }, []);

  const closeModal = () => {
    setSelected(null);
    setCopied(false);
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="promotions-page">
      <div className="container">
        <header className="promotions-header">
          <h1>Promotions</h1>
          <p>Special offers and seasonal deals from Picha Restaurant.</p>
        </header>

        {loading && <p className="promotions-status">Loading promotions…</p>}
        {!loading && error && <p className="promotions-status promotions-error">{error}</p>}
        {!loading && !error && promotions.length === 0 && (
          <p className="promotions-status">No active promotions right now. Check back soon.</p>
        )}

        {!loading && !error && promotions.length > 0 && (
          <div className="promotions-grid">
            {promotions.map((promo) => (
              <button
                key={promo.id}
                type="button"
                className="promo-card"
                onClick={() => setSelected(promo)}
              >
                <img
                  src={promo.coverImage || PLACEHOLDER_COVER}
                  alt={promo.title}
                  className="promo-card-cover"
                />
                <div className="promo-card-overlay">
                  <h2>{promo.title}</h2>
                  {promo.discountPercent != null && (
                    <span className="promo-card-badge">{promo.discountPercent}% off</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="promo-modal-overlay" onClick={closeModal}>
          <div className="promo-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="promo-modal-close" onClick={closeModal} aria-label="Close">
              ×
            </button>
            <img
              src={selected.coverImage || PLACEHOLDER_COVER}
              alt={selected.title}
              className="promo-modal-cover"
            />
            <div className="promo-modal-body">
              <h2>{selected.title}</h2>
              {selected.description && <p>{selected.description}</p>}
              {selected.discountPercent != null && (
                <p><strong>Discount:</strong> {selected.discountPercent}% off</p>
              )}
              {selected.code && (
                <div className="promo-code-row">
                  <p><strong>Promo code:</strong> <code>{selected.code}</code></p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => copyCode(selected.code)}>
                    {copied ? 'Copied' : 'Copy code'}
                  </button>
                </div>
              )}
              {(selected.startsAt || selected.endsAt) && (
                <p className="promo-validity">
                  {selected.startsAt && selected.endsAt && (
                    <>Valid {formatDate(selected.startsAt)} – {formatDate(selected.endsAt)}</>
                  )}
                  {selected.startsAt && !selected.endsAt && (
                    <>Starts {formatDate(selected.startsAt)}</>
                  )}
                  {!selected.startsAt && selected.endsAt && (
                    <>Ends {formatDate(selected.endsAt)}</>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Promotions;
