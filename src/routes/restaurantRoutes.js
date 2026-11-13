const express = require("express");
const {
  fetchRestaurantTables,
  fetchRestaurantOrders,
  loginRestaurant,
  modifyTableStatus,
  addTable,
  removeTable,
  checkoutTableController,
  updateSettingsController,
} = require("../controllers/restaurantController");

const router = express.Router();

// Restaurant admin auth
router.post("/restaurants/auth", loginRestaurant);

// Restaurant table and order metrics
router.get("/restaurants/:restaurantId/tables", fetchRestaurantTables);
router.get("/restaurants/:restaurantId/orders", fetchRestaurantOrders);

// Table status modifier
router.patch("/restaurants/:restaurantId/tables/:tableNumber", modifyTableStatus);

// Table CRUD management
router.post("/restaurants/:restaurantId/tables", addTable);
router.delete("/tables/:tableId", removeTable);
router.patch("/tables/:tableId/checkout", checkoutTableController);

// Settings management
router.patch("/settings", updateSettingsController);

module.exports = router;
