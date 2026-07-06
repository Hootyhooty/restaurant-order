const { EventEmitter } = require('events');

const hub = new EventEmitter();
hub.setMaxListeners(100);

function emitKitchenEvent(type, payload = {}) {
  hub.emit('kitchen', { type, at: Date.now(), ...payload });
}

function subscribeKitchenEvents(listener) {
  hub.on('kitchen', listener);
  return () => hub.off('kitchen', listener);
}

module.exports = { emitKitchenEvent, subscribeKitchenEvents };
