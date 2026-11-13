const express = require("express");
const {
  fetchRestaurantMenu,
  addCategory,
  modifyCategory,
  removeCategory,
  addItemToCategory,
  modifyMenuItem,
  removeMenuItem,
} = require("../controllers/menuController");

const router = express.Router();

// Public / Menu Fetch
router.get("/restaurants/:restaurantId/menu", fetchRestaurantMenu);

// Admin Category Management
router.post("/restaurants/:restaurantId/categories", addCategory);
router.put("/categories/:categoryId", modifyCategory);
router.delete("/categories/:categoryId", removeCategory);

// Admin Menu Item Management
router.post("/categories/:categoryId/items", addItemToCategory);
router.put("/menu-items/:itemId", modifyMenuItem);
router.delete("/menu-items/:itemId", removeMenuItem);

module.exports = router;
