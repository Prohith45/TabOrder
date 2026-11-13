const { createOrder, confirmOrder } = require("../services/orderService");
const { emitNewOrderToRestaurant, emitOrderUpdateToRestaurant } = require("../socket/socketServer");
const { printOrderTicket } = require("../services/printerService");

const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

async function createRestaurantOrder(req, res, next) {
  try {
    const { restaurantId, tableNumber, sessionToken } = req.body;
    
    if (!restaurantId || !Number.isInteger(Number(tableNumber))) {
      return next(httpError(400, "restaurantId and tableNumber are required"));
    }

    const normalizedTableNumber = Number(tableNumber);
    const incomingToken = sessionToken || "";

    // Fetch the table details first
    const table = await prisma.table.findUnique({
      where: {
        restaurantId_tableNumber: {
          restaurantId,
          tableNumber: normalizedTableNumber,
        },
      },
    });

    if (!table) {
      return next(httpError(404, "Table not found for this restaurant"));
    }

    const now = new Date();

    if (!table.currentSessionToken) {
      // Lock the table to the incoming sessionToken for 2 hours
      await prisma.table.update({
        where: { id: table.id },
        data: {
          currentSessionToken: incomingToken,
          sessionExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        },
      });
    } else {
      // Check if the session has expired
      const isExpired = table.sessionExpiresAt && now > new Date(table.sessionExpiresAt);

      if (isExpired) {
        // If expired, reset and lock to the new incoming sessionToken
        await prisma.table.update({
          where: { id: table.id },
          data: {
            currentSessionToken: incomingToken,
            sessionExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
          },
        });
      } else if (table.currentSessionToken !== incomingToken) {
        // If token does not match and session is still active, return 403 Forbidden
        return next(httpError(403, "Table is already in use by another customer."));
      }
    }

    const order = await createOrder(req.body);

    try {
      emitNewOrderToRestaurant(order);
    } catch (socketError) {
      console.error("Failed to emit new_order event", {
        message: socketError.message,
        restaurantId: order.restaurantId,
        orderId: order.id,
      });
    }

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

async function confirmRestaurantOrder(req, res, next) {
  try {
    const order = await confirmOrder(req.params.orderId);

    try {
      emitOrderUpdateToRestaurant(order);
    } catch (socketError) {
      console.error("Failed to emit order_updated event for confirmation:", {
        message: socketError.message,
        restaurantId: order.restaurantId,
        orderId: order.id,
      });
    }

    // Trigger printing asynchronously in the background on confirmation
    printOrderTicket(order).catch((printError) => {
      console.error("Async print order ticket task failed on confirmation:", printError);
    });

    res.json(order);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createRestaurantOrder,
  confirmRestaurantOrder,
};
