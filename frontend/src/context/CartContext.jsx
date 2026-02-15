// Cart state - items with quantity and price
import { createContext, useState, useContext, useCallback } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((meal, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.meal.id === meal.id);
      if (existing) {
        return prev.map((i) =>
          i.meal.id === meal.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { meal, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((mealId) => {
    setItems((prev) => prev.filter((i) => i.meal.id !== mealId));
  }, []);

  const updateQuantity = useCallback((mealId, quantity) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.meal.id !== mealId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.meal.id === mealId ? { ...i, quantity } : i
      )
    );
  }, []);

  const getTotalCount = useCallback(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const getTotalPrice = useCallback(
    () => items.reduce((sum, i) => sum + i.meal.price * i.quantity, 0),
    [items]
  );

  const value = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    getTotalCount,
    getTotalPrice,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
