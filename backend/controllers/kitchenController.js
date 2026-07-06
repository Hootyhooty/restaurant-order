const KitchenOrder = require('../models/KitchenOrder');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const AppError = require('../utils/appError');
const { getBangkokDateString } = require('../utils/bangkokDate');
const {
  deriveTicketStatus,
  normalizeLineStatus,
  normalizeLines,
} = require('../utils/kitchenOrderStatus');
const { ensureStockRows, updateMealStock, decrementStockForServedLines } = require('../services/mealStockService');
const { emitKitchenEvent } = require('../utils/kitchenEventHub');
const crypto = require('crypto');

const SOURCE_LABELS = {
  booking_preorder: 'Pre-order',
  staff_table: 'Table',
  online: 'Online',
};

const mapKitchenOrder = (order) => {
  const isReservation = order.source === 'booking_preorder';
  return {
    id: order._id,
    ticketNumber: order.ticketNumber ?? null,
    reservedTicketNumber: order.reservedTicketNumber ?? null,
    visitTimeSlot: order.visitTimeSlot ?? null,
    displayNumber: isReservation ? order.reservedTicketNumber : order.ticketNumber,
    displayNumberLabel: isReservation ? 'Reserved' : '#',
    serviceDate: order.serviceDate,
    source: order.source,
    sourceLabel: SOURCE_LABELS[order.source] || order.source,
    tableId: order.tableId ?? null,
    customerName: order.customerName,
    status: order.status,
    lines: normalizeLines(order.lines || []),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const formatCustomerName = (customer) => {
  const full = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ').trim();
  return full || customer?.username || 'Guest';
};

// GET /api/kitchen/orders?date=&status=
const getKitchenOrders = async (req, res) => {
  try {
    const date = String(req.query.date || getBangkokDateString()).trim();
    const status = String(req.query.status || '').trim();

    const filter = { serviceDate: date };
    if (status) filter.status = status;

    const orders = await KitchenOrder.find(filter)
      .sort({ createdAt: 1 })
      .lean();

    const payload = {
      success: true,
      date,
      items: orders.map(mapKitchenOrder),
    };

    const etagSource = orders.map((o) => `${o._id}:${o.updatedAt?.getTime?.() || 0}`).join('|');
    const etag = `"${crypto.createHash('md5').update(etagSource).digest('hex')}"`;
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.json(payload);
  } catch (error) {
    console.error('Kitchen get orders error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load orders' });
  }
};

// GET /api/kitchen/reservations?date=
const getKitchenReservations = async (req, res) => {
  try {
    const date = String(req.query.date || getBangkokDateString()).trim();

    const bookings = await Booking.find({
      date,
      status: 'confirmed',
      'preOrderItems.0': { $exists: true },
    })
      .sort({ timeSlot: 1 })
      .lean();

    if (!bookings.length) {
      return res.json({ success: true, date, items: [] });
    }

    const bookingIds = bookings.map((b) => b._id.toString());
    const existingOrders = await KitchenOrder.find({ bookingId: { $in: bookingIds } })
      .select('bookingId')
      .lean();
    const checkedInIds = new Set(existingOrders.map((o) => o.bookingId));

    const pending = bookings.filter((b) => !checkedInIds.has(b._id.toString()));

    const userIds = [...new Set(pending.map((b) => b.userId))];
    const customers = await Customer.find({ _id: { $in: userIds } })
      .select('username first_name last_name')
      .lean();
    const customerById = new Map(customers.map((c) => [c._id.toString(), c]));

    const items = pending.map((b) => ({
      id: b._id.toString(),
      tableId: b.tableId,
      customerName: formatCustomerName(customerById.get(b.userId)),
      date: b.date,
      timeSlot: b.timeSlot,
      guestCount: b.guestCount,
      preOrderLines: (b.preOrderItems || []).map((item) => ({
        mealId: item.mealId,
        name: item.name,
        quantity: item.quantity,
      })),
    }));

    return res.json({ success: true, date, items });
  } catch (error) {
    console.error('Kitchen get reservations error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load reservations' });
  }
};

// GET /api/kitchen/orders/:id
const getKitchenOrder = async (req, res) => {
  try {
    const order = await KitchenOrder.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.json({ success: true, item: mapKitchenOrder(order) });
  } catch (error) {
    console.error('Kitchen get order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load order' });
  }
};

const ALLOWED_LINE_PATCH_STATUSES = new Set(['preparing', 'ready', 'served', 'cancelled']);

// PATCH /api/kitchen/orders/:id/lines
const patchKitchenOrderLines = async (req, res) => {
  try {
    const lineStatus = normalizeLineStatus(req.body?.lineStatus);
    if (!ALLOWED_LINE_PATCH_STATUSES.has(lineStatus)) {
      return res.status(400).json({
        success: false,
        message: 'lineStatus must be preparing, ready, served, or cancelled.',
      });
    }

    let lineIndexes = req.body?.lineIndexes;
    if (!Array.isArray(lineIndexes) || lineIndexes.length === 0) {
      return res.status(400).json({ success: false, message: 'lineIndexes must be a non-empty array.' });
    }
    lineIndexes = [...new Set(lineIndexes.map((i) => Number(i)).filter((i) => Number.isInteger(i) && i >= 0))];
    if (!lineIndexes.length) {
      return res.status(400).json({ success: false, message: 'Invalid lineIndexes.' });
    }

    const order = await KitchenOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    for (const idx of lineIndexes) {
      if (idx >= order.lines.length) {
        return res.status(400).json({ success: false, message: `Invalid line index: ${idx}` });
      }
      order.lines[idx].lineStatus = lineStatus;
    }

    order.status = deriveTicketStatus(order.lines);
    order.markModified('lines');
    await order.save();
    if (lineStatus === 'served') {
      const servedLines = lineIndexes.map((idx) => order.lines[idx]);
      await decrementStockForServedLines(servedLines);
    }
    emitKitchenEvent('orders_updated', { orderId: order._id.toString(), date: order.serviceDate });

    return res.json({ success: true, item: mapKitchenOrder(order.toObject()) });
  } catch (error) {
    console.error('Kitchen patch lines error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update lines' });
  }
};

// PATCH /api/kitchen/orders/:id — mark all pending lines as preparing
const patchKitchenOrder = async (req, res) => {
  try {
    const order = await KitchenOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let changed = false;
    for (const line of order.lines) {
      if (line.lineStatus === 'pending') {
        line.lineStatus = 'preparing';
        changed = true;
      }
    }
    if (!changed) {
      throw new AppError('No pending lines to start preparing.', 400);
    }

    order.status = deriveTicketStatus(order.lines);
    order.markModified('lines');
    await order.save();
    emitKitchenEvent('orders_updated', { orderId: order._id.toString(), date: order.serviceDate });

    return res.json({ success: true, item: mapKitchenOrder(order.toObject()) });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Kitchen patch order error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update order' });
  }
};

// GET /api/kitchen/stock
const getKitchenStock = async (req, res) => {
  try {
    const items = await ensureStockRows();
    return res.json({ success: true, items });
  } catch (error) {
    console.error('Kitchen get stock error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to load stock' });
  }
};

// PATCH /api/kitchen/stock/:mealFileId
const patchKitchenStock = async (req, res) => {
  try {
    const mealFileId = Number(req.params.mealFileId);
    if (!Number.isInteger(mealFileId)) {
      return res.status(400).json({ success: false, message: 'Invalid meal id.' });
    }
    const item = await updateMealStock(mealFileId, {
      stock: req.body?.stock,
      lowStockThreshold: req.body?.lowStockThreshold,
    });
    emitKitchenEvent('stock_updated', { mealFileId });
    return res.json({ success: true, item });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Kitchen patch stock error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update stock' });
  }
};

// GET /api/kitchen/stream — SSE for queue/stock updates
const streamKitchenEvents = async (req, res) => {
  const { subscribeKitchenEvents } = require('../utils/kitchenEventHub');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event) => {
    res.write(`event: kitchen\ndata: ${JSON.stringify(event)}\n\n`);
  };

  send({ type: 'connected', at: Date.now() });
  const unsubscribe = subscribeKitchenEvents(send);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

module.exports = {
  getKitchenOrders,
  getKitchenReservations,
  getKitchenOrder,
  patchKitchenOrderLines,
  patchKitchenOrder,
  getKitchenStock,
  patchKitchenStock,
  streamKitchenEvents,
  mapKitchenOrder,
};
