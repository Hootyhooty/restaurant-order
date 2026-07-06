const AppError = require('../utils/appError');
const KitchenOrder = require('../models/KitchenOrder');
const { getMealsData } = require('../utils/mealsData');
const { expandOrderLines } = require('../utils/expandOrderLines');
const { getBangkokDateString } = require('../utils/bangkokDate');
const { nextTicketNumber } = require('./kitchenTicketNumber');

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('At least one menu item is required.', 400);
  }
  if (rawItems.length > 30) {
    throw new AppError('Cannot order more than 30 line items at once.', 400);
  }

  const meals = getMealsData();
  const mealById = new Map(meals.map((m) => [Number(m.id), m]));
  const collapsed = [];

  for (const raw of rawItems) {
    const mealId = Number(raw?.mealId ?? raw?.id);
    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(mealId) || mealId < 1) {
      throw new AppError('Invalid meal id.', 400);
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new AppError('Quantity must be between 1 and 99.', 400);
    }
    const meal = mealById.get(mealId);
    if (!meal) {
      throw new AppError(`Unknown meal id: ${mealId}`, 400);
    }
    collapsed.push({
      mealId,
      name: meal.name,
      unitPrice: Number(meal.price) || 0,
      quantity,
    });
  }

  return expandOrderLines(collapsed);
}

/**
 * Create a staff table order (kitchen ticket only, no Stripe).
 */
async function createStaffTableOrder({ tableId, customerName, items, staffUserId }) {
  const table = Number(tableId);
  if (!Number.isInteger(table) || table < 1 || table > 12) {
    throw new AppError('Table number must be between 1 and 12.', 400);
  }

  const lines = normalizeItems(items);
  const serviceDate = getBangkokDateString();
  const ticketNumber = await nextTicketNumber(serviceDate);
  const displayName =
    String(customerName || '').trim() || `Table ${table}`;

  return KitchenOrder.create({
    ticketNumber,
    serviceDate,
    source: 'staff_table',
    tableId: table,
    customerName: displayName,
    createdByStaffId: staffUserId || undefined,
    lines,
    status: 'pending',
  });
}

module.exports = { createStaffTableOrder, normalizeItems };
