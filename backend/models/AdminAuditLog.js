const mongoose = require('mongoose');
const { generateUUID } = require('../utils/uuid');

const adminAuditLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateUUID },
    adminId: { type: String, required: true, index: true },
    adminUsername: { type: String, trim: true, default: '' },
    action: { type: String, required: true, trim: true, index: true },
    resourceType: { type: String, required: true, trim: true, default: 'booking', index: true },
    resourceId: { type: String, trim: true, index: true },
    bookingId: { type: String, trim: true, index: true },
    requestId: { type: String, trim: true },
    previousStatus: { type: String, trim: true },
    newStatus: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, trim: true },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ bookingId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
