import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../apiConfig';
import { apiFetch } from '../apiClient';
import { userHasAddress } from '../utils/profileUtils';
import AddressRequiredModal from './AddressRequiredModal';
import './Booking.css';

const TIME_SLOTS = [
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '17:00-19:00',
  '19:00-21:00',
];

const GUEST_OPTIONS = [2, 4, 6, 8];

const reservationCostForGuests = (guestCount) => {
  if (guestCount === 2 || guestCount === 4) return 500;
  if (guestCount === 6) return 1000;
  if (guestCount === 8) return 1500;
  return 0;
};

const guestAllowedForTable = (guestCount, tableId) => {
  if (!guestCount) return false;
  if (tableId === 1) return guestCount === 8;
  if (tableId >= 10 && tableId <= 12) return guestCount === 6;
  return guestCount === 2 || guestCount === 4;
};

const tomorrowISO = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatSlot = (slot) => slot.replace('-', '–');

const Booking = () => {
  const { isLoggedIn, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [guestCount, setGuestCount] = useState('');
  const guestCountNum = guestCount ? Number(guestCount) : null;

  const [availability, setAvailability] = useState(null); // { [tableId]: true/false }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canLoadTables = Boolean(selectedDate && selectedSlot && guestCountNum);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!canLoadTables) {
        setAvailability(null);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('date', selectedDate);
        params.set('timeSlot', selectedSlot);
        params.set('guestCount', String(guestCountNum));
        const res = await apiFetch(`${API_BASE}/api/bookings/availability?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        setAvailability(data?.availability || {});
      } catch (e) {
        setAvailability(null);
        setError(e.message || 'Failed to load availability');
      } finally {
        setLoading(false);
      }
    };
    loadAvailability();
  }, [canLoadTables, selectedDate, selectedSlot, guestCountNum]);

  // Reservation modal flow
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveStep, setReserveStep] = useState(1); // 1 pre-order? | 2 menu | 3 summary
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [wantsPreOrder, setWantsPreOrder] = useState(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const [meals, setMeals] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [preOrderQty, setPreOrderQty] = useState({}); // { [mealId]: number }
  const [descMeal, setDescMeal] = useState(null);
  const modalRef = useRef(null);

  const preOrderItems = useMemo(() => {
    const items = [];
    for (const [idStr, q] of Object.entries(preOrderQty || {})) {
      const qty = Number(q);
      const mealId = Number(idStr);
      if (!Number.isFinite(mealId) || !Number.isFinite(qty) || qty <= 0) continue;
      const meal = meals.find((m) => Number(m.id) === mealId);
      if (!meal) continue;
      items.push({ mealId, name: meal.name, unitPrice: Number(meal.price) || 0, quantity: qty });
    }
    items.sort((a, b) => a.mealId - b.mealId);
    return items;
  }, [preOrderQty, meals]);

  const preOrderTotal = useMemo(
    () => preOrderItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [preOrderItems]
  );

  const reservationFee = 100;
  const reservationCost = guestCountNum ? reservationCostForGuests(guestCountNum) : 0;
  const amountTotal = Math.max(0, reservationFee + reservationCost + preOrderTotal);

  const closeReserve = () => {
    if (isPaying) return;
    setReserveOpen(false);
    setReserveStep(1);
    setSelectedTableId(null);
    setWantsPreOrder(null);
    setRedeemCode('');
    setPreOrderQty({});
    setActiveCategory('all');
    setDescMeal(null);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!reserveOpen) return;
      if (e.key === 'Escape') closeReserve();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reserveOpen, isPaying]);

  const ensureMealsLoaded = async () => {
    if (meals.length > 0) return;
    const res = await apiFetch(`${API_BASE}/api/meals`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Failed to load menu');
    setMeals(data.items || []);
    setCategories(data.categories || [{ id: 'all', name: 'All' }]);
  };

  const onPickTable = async (tableId) => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: '/booking' } });
      return;
    }
    setSelectedTableId(tableId);
    setReserveOpen(true);
    setReserveStep(1);
    setWantsPreOrder(null);
  };

  const isTableClickable = (tableId) => {
    if (!canLoadTables || !availability) return false;
    if (!guestAllowedForTable(guestCountNum, tableId)) return false;
    return Boolean(availability[String(tableId)] ?? availability[tableId]);
  };

  const isTableExcluded = (tableId) => {
    if (!canLoadTables) return false;
    if (!guestCountNum) return false;
    return !guestAllowedForTable(guestCountNum, tableId);
  };

  const displayTableText = (tableId) => {
    if (!canLoadTables) return String(tableId);
    if (isTableExcluded(tableId)) return String(tableId);
    if (!availability) return String(tableId);
    const ok = Boolean(availability[String(tableId)] ?? availability[tableId]);
    return ok ? String(tableId) : 'NA';
  };

  const filteredMeals = activeCategory === 'all'
    ? meals
    : meals.filter((m) => m.category === activeCategory);

  const updateQty = (mealId, nextQty) => {
    const q = Math.max(0, Number(nextQty) || 0);
    setPreOrderQty((prev) => {
      const copy = { ...(prev || {}) };
      if (q <= 0) delete copy[String(mealId)];
      else copy[String(mealId)] = q;
      return copy;
    });
  };

  const startPayment = async () => {
    try {
      if (!selectedTableId || !canLoadTables) return;
      if (!userHasAddress(user)) {
        setShowAddressModal(true);
        return;
      }
      setIsPaying(true);
      const payload = {
        date: selectedDate,
        timeSlot: selectedSlot,
        guestCount: guestCountNum,
        tableId: selectedTableId,
        redeemCode: redeemCode.trim(),
        preOrderItems: preOrderItems.map((i) => ({ id: i.mealId, quantity: i.quantity })),
      };
      const res = await apiFetch(`${API_BASE}/api/bookings/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.message || `Failed to start payment (HTTP ${res.status})`);
      window.location.href = data.url;
    } catch (e) {
      alert(e.message || 'Failed to start payment.');
      setIsPaying(false);
    }
  };

  return (
    <section className="booking-page">
      <div className="container">
        <div className="booking-header">
          <h2 className="booking-title">Restaurant Booking</h2>
          <p className="booking-subtitle">Choose date, time, and guests to see available tables.</p>
        </div>

        <div className="booking-controls">
          <div className="booking-control">
            <label htmlFor="booking-date" className="booking-label">Date</label>
            <input
              id="booking-date"
              className="booking-input"
              type="date"
              min={tomorrowISO()}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="booking-control booking-control-wide">
            <label htmlFor="booking-slot" className="booking-label">Time</label>
            <select
              id="booking-slot"
              className="booking-input"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="">Select a time slot…</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>{formatSlot(s)}</option>
              ))}
            </select>
          </div>
          <div className="booking-control">
            <label htmlFor="booking-guests" className="booking-label">Guest</label>
            <select
              id="booking-guests"
              className="booking-input"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
            >
              <option value="">—</option>
              {GUEST_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {canLoadTables && (
          <div className="booking-hint">
            Showing tables for <strong>{guestCountNum}</strong> guests on <strong>{selectedDate}</strong> at{' '}
            <strong>{formatSlot(selectedSlot)}</strong>.
          </div>
        )}

        {loading && <div className="booking-status">Loading availability…</div>}
        {error && <div className="booking-status booking-error">{error}</div>}

        <div className="booking-map-wrap">
          <div className="booking-map">
            <div className="map-rect reception">reception</div>
            <div className="map-rect bar">Bar</div>
            <div className="map-rect stage">stage</div>

            <button
              type="button"
              className={`map-table t1 ${isTableExcluded(1) ? 'excluded' : isTableClickable(1) ? 'available' : 'unavailable'}`}
              onClick={() => isTableClickable(1) && onPickTable(1)}
              disabled={!isTableClickable(1)}
            >
              {displayTableText(1)}
            </button>

            {[2, 3, 4, 5].map((t) => (
              <button
                key={t}
                type="button"
                className={`map-table t${t} ${isTableExcluded(t) ? 'excluded' : isTableClickable(t) ? 'available' : 'unavailable'}`}
                onClick={() => isTableClickable(t) && onPickTable(t)}
                disabled={!isTableClickable(t)}
              >
                {displayTableText(t)}
              </button>
            ))}

            {[6, 7, 8, 9].map((t) => (
              <button
                key={t}
                type="button"
                className={`map-table t${t} ${isTableExcluded(t) ? 'excluded' : isTableClickable(t) ? 'available' : 'unavailable'}`}
                onClick={() => isTableClickable(t) && onPickTable(t)}
                disabled={!isTableClickable(t)}
              >
                {displayTableText(t)}
              </button>
            ))}

            {[10, 11, 12].map((t) => (
              <button
                key={t}
                type="button"
                className={`map-table t${t} ${isTableExcluded(t) ? 'excluded' : isTableClickable(t) ? 'available' : 'unavailable'}`}
                onClick={() => isTableClickable(t) && onPickTable(t)}
                disabled={!isTableClickable(t)}
              >
                {displayTableText(t)}
              </button>
            ))}
          </div>
        </div>

        {canLoadTables && (
          <div className="booking-legend">
            <div className="legend-item">
              <span className="legend-dot available" /> Available (clickable)
            </div>
            <div className="legend-item">
              <span className="legend-dot unavailable" /> Not available (NA)
            </div>
            <div className="legend-item">
              <span className="legend-dot excluded" /> Excluded by guest count
            </div>
          </div>
        )}

        {canLoadTables && guestCountNum && (
          <div className="booking-status">
            Eligible tables:{' '}
            <strong>
              {guestCountNum === 8 ? '1' : guestCountNum === 6 ? '10–12' : '2–9'}
            </strong>
          </div>
        )}
      </div>

      {reserveOpen && (
        <div className="booking-modal-overlay" onClick={closeReserve}>
          <div className="booking-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h3 className="booking-modal-title">Reserve table {selectedTableId}</h3>
              <button type="button" className="booking-modal-close" onClick={closeReserve} disabled={isPaying}>
                ×
              </button>
            </div>

            {reserveStep === 1 && (
              <div className="booking-modal-body">
                <p className="booking-modal-text">Do you prefer to pre-order food?</p>
                <div className="booking-modal-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      setWantsPreOrder(true);
                      await ensureMealsLoaded();
                      setReserveStep(2);
                    }}
                    disabled={isPaying}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setWantsPreOrder(false);
                      setReserveStep(3);
                    }}
                    disabled={isPaying}
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {reserveStep === 2 && (
              <div className="booking-modal-body booking-menu-popup">
                <div className="booking-menu-sidebar">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`booking-menu-cat ${activeCategory === c.id ? 'active' : ''}`}
                      onClick={() => setActiveCategory(c.id)}
                      disabled={isPaying}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="booking-menu-list">
                  {filteredMeals.length === 0 ? (
                    <div className="booking-modal-text">No menu items.</div>
                  ) : (
                    filteredMeals.slice(0, 30).map((m) => {
                      const qty = Number(preOrderQty[String(m.id)] || 0);
                      return (
                        <div key={m.id} className="booking-menu-item">
                          <img className="booking-menu-img" src={m.image} alt={m.name} />
                          <div className="booking-menu-info">
                            <div className="booking-menu-name">{m.name}</div>
                            <div className="booking-menu-desc">
                              {(m.description || '').slice(0, 60)}
                              {(m.description || '').length > 60 ? '…' : ''}
                            </div>
                            <button
                              type="button"
                              className="booking-menu-more"
                              onClick={() => setDescMeal(m)}
                              disabled={isPaying}
                            >
                              Extend description
                            </button>
                          </div>
                          <div className="booking-menu-right">
                            <div className="booking-menu-price">฿{Number(m.price || 0).toLocaleString()}</div>
                            <div className="booking-menu-qty">
                              <button
                                type="button"
                                className="booking-qty-btn"
                                onClick={() => updateQty(m.id, qty - 1)}
                                disabled={isPaying || qty <= 0}
                              >
                                ◀
                              </button>
                              <div className="booking-qty-pill">{qty}</div>
                              <button
                                type="button"
                                className="booking-qty-btn"
                                onClick={() => updateQty(m.id, qty + 1)}
                                disabled={isPaying}
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div className="booking-modal-actions booking-modal-actions-split">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setReserveStep(1);
                        setWantsPreOrder(null);
                      }}
                      disabled={isPaying}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setReserveStep(3)}
                      disabled={isPaying}
                    >
                      Next
                    </button>
                  </div>
                </div>

                {descMeal && (
                  <div className="booking-desc-overlay" onClick={() => setDescMeal(null)}>
                    <div className="booking-desc-modal" onClick={(e) => e.stopPropagation()}>
                      <div className="booking-desc-title">{descMeal.name}</div>
                      <div className="booking-desc-body">{descMeal.description}</div>
                      <button type="button" className="btn btn-primary" onClick={() => setDescMeal(null)}>
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reserveStep === 3 && (
              <div className="booking-modal-body">
                <div className="booking-summary">
                  <div><strong>Table:</strong> {selectedTableId}</div>
                  <div><strong>Date:</strong> {selectedDate}</div>
                  <div><strong>Time:</strong> {formatSlot(selectedSlot)}</div>
                  <div><strong>Guests:</strong> {guestCountNum}</div>
                  <hr />
                  <div><strong>Reservation fee:</strong> ฿{reservationFee}</div>
                  <div><strong>Reservation cost:</strong> ฿{reservationCost}</div>
                  <div><strong>Pre-order total:</strong> ฿{preOrderTotal.toLocaleString()}</div>
                  <div className="booking-summary-total"><strong>Total:</strong> ฿{amountTotal.toLocaleString()}</div>
                  <p className="booking-summary-note">
                    Reservation cost will be paid back when you check in on time.
                  </p>
                </div>

                <div className="booking-redeem">
                  <label className="booking-label" htmlFor="booking-redeem">Redeem code</label>
                  <input
                    id="booking-redeem"
                    className="booking-input"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    placeholder="Enter code"
                    disabled={isPaying}
                  />
                </div>

                <div className="booking-modal-actions booking-modal-actions-split">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeReserve} disabled={isPaying}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={startPayment} disabled={isPaying}>
                    {isPaying ? 'Redirecting…' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AddressRequiredModal
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
      />
    </section>
  );
};

export default Booking;

