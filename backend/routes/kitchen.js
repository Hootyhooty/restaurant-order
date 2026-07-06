const express = require('express');
const router = express.Router();
const { rolesRequired } = require('../controllers/authController');
const { writeLimiter } = require('../utils/security');
const {
  getKitchenOrders,
  getKitchenReservations,
  getKitchenOrder,
  patchKitchenOrderLines,
  patchKitchenOrder,
  getKitchenStock,
  patchKitchenStock,
  streamKitchenEvents,
} = require('../controllers/kitchenController');
const {
  validateKitchenOrdersQuery,
  validateMongoIdParam,
  validateKitchenPatchLinesBody,
} = require('../utils/validation');

const kitchenOrAdmin = rolesRequired('KITCHEN', 'ADMIN');
const kitchenOnly = rolesRequired('KITCHEN');

router.get('/orders', kitchenOrAdmin, validateKitchenOrdersQuery, getKitchenOrders);
router.get('/reservations', kitchenOrAdmin, validateKitchenOrdersQuery, getKitchenReservations);
router.get('/orders/:id', kitchenOrAdmin, validateMongoIdParam('id'), getKitchenOrder);
router.patch(
  '/orders/:id/lines',
  writeLimiter,
  kitchenOnly,
  validateMongoIdParam('id'),
  validateKitchenPatchLinesBody,
  patchKitchenOrderLines,
);
router.patch('/orders/:id', writeLimiter, kitchenOnly, validateMongoIdParam('id'), patchKitchenOrder);
router.get('/stock', kitchenOrAdmin, getKitchenStock);
router.patch('/stock/:mealFileId', writeLimiter, kitchenOnly, patchKitchenStock);
router.get('/stream', rolesRequired('KITCHEN', 'ADMIN', 'STAFF'), streamKitchenEvents);

module.exports = router;
