const Promotion = require('../models/Promotion');

const mapPromotion = (doc) => ({
  id: doc._id,
  title: doc.title,
  description: doc.description,
  code: doc.code || null,
  discountPercent: doc.discountPercent ?? null,
  active: doc.active !== false,
  startsAt: doc.startsAt || null,
  endsAt: doc.endsAt || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function isPromotionVisible(promo, now = new Date()) {
  if (promo.active === false) return false;
  if (promo.startsAt && now < new Date(promo.startsAt)) return false;
  if (promo.endsAt && now > new Date(promo.endsAt)) return false;
  return true;
}

const listAdminPromotions = async (req, res) => {
  try {
    const items = await Promotion.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, items: items.map(mapPromotion) });
  } catch (error) {
    console.error('List promotions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createPromotion = async (req, res) => {
  try {
    const { title, description, code, discountPercent, active, startsAt, endsAt } = req.body || {};
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }
    const promo = await Promotion.create({
      title: title.trim(),
      description: String(description || '').trim(),
      code: code ? String(code).trim().toUpperCase() : undefined,
      discountPercent: discountPercent != null ? Number(discountPercent) : undefined,
      active: active !== false,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : undefined,
    });
    return res.status(201).json({ success: true, item: mapPromotion(promo.toObject()) });
  } catch (error) {
    console.error('Create promotion error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.promotionId);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }
    const { title, description, code, discountPercent, active, startsAt, endsAt } = req.body || {};
    if (title !== undefined) promo.title = String(title).trim();
    if (description !== undefined) promo.description = String(description).trim();
    if (code !== undefined) promo.code = code ? String(code).trim().toUpperCase() : undefined;
    if (discountPercent !== undefined) promo.discountPercent = Number(discountPercent);
    if (active !== undefined) promo.active = Boolean(active);
    if (startsAt !== undefined) promo.startsAt = startsAt ? new Date(startsAt) : undefined;
    if (endsAt !== undefined) promo.endsAt = endsAt ? new Date(endsAt) : undefined;
    await promo.save();
    return res.json({ success: true, item: mapPromotion(promo.toObject()) });
  } catch (error) {
    console.error('Update promotion error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deletePromotion = async (req, res) => {
  try {
    const promo = await Promotion.findByIdAndDelete(req.params.promotionId);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete promotion error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const listPublicPromotions = async (req, res) => {
  try {
    const now = new Date();
    const items = await Promotion.find({ active: { $ne: false } }).sort({ createdAt: -1 }).lean();
    return res.json({
      success: true,
      items: items.filter((p) => isPromotionVisible(p, now)).map(mapPromotion),
    });
  } catch (error) {
    console.error('Public promotions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  listAdminPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listPublicPromotions,
  mapPromotion,
  isPromotionVisible,
};
