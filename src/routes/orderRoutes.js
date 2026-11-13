const express = require("express");
const { createRestaurantOrder, confirmRestaurantOrder } = require("../controllers/orderController");

const router = express.Router();

router.post("/orders", createRestaurantOrder);
router.patch("/orders/:orderId/confirm", confirmRestaurantOrder);

module.exports = router;
