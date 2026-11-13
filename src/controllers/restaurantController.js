const { getTables, getOrders, authenticateRestaurant, updateTableStatus, createTable, deleteTable, checkoutTable, updateRestaurantSettings } = require("../services/restaurantService");
const { emitTableUpdateToRestaurant, emitOrderUpdateToRestaurant } = require("../socket/socketServer");

async function fetchRestaurantTables(req, res, next) {
  try {
    const tables = await getTables(req.params.restaurantId);
    res.json(tables);
  } catch (error) {
    next(error);
  }
}

async function fetchRestaurantOrders(req, res, next) {
  try {
    const orders = await getOrders(req.params.restaurantId);
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

async function loginRestaurant(req, res, next) {
  try {
    const restaurant = await authenticateRestaurant(req.body.passkey);
    res.json(restaurant);
  } catch (error) {
    next(error);
  }
}

async function modifyTableStatus(req, res, next) {
  try {
    const restaurantId = req.params.restaurantId;
    const tableNumber = Number(req.params.tableNumber);
    const status = req.body.status;
    const { table, orders } = await updateTableStatus(restaurantId, tableNumber, status);

    try {
      emitTableUpdateToRestaurant(restaurantId, table);
      if (orders && orders.length > 0) {
        orders.forEach((order) => {
          emitOrderUpdateToRestaurant(order);
        });
      }
    } catch (socketError) {
      console.error("Failed to emit table/order updates:", socketError.message);
    }

    res.json(table);
  } catch (error) {
    next(error);
  }
}

async function addTable(req, res, next) {
  try {
    const table = await createTable(req.params.restaurantId, req.body);
    res.status(201).json(table);
  } catch (error) {
    next(error);
  }
}

async function removeTable(req, res, next) {
  try {
    const result = await deleteTable(req.params.tableId);
    res.json({ ok: true, deleted: result });
  } catch (error) {
    next(error);
  }
}

async function checkoutTableController(req, res, next) {
  try {
    const tableId = req.params.tableId;
    const { paymentMethod, transactionId } = req.body;
    const { table, orders } = await checkoutTable(tableId, { paymentMethod, transactionId });

    // Emit updates via Socket.IO
    try {
      emitTableUpdateToRestaurant(table.restaurantId, table);
      orders.forEach((order) => {
        emitOrderUpdateToRestaurant(order);
      });
    } catch (socketError) {
      console.error("Failed to emit checkout updates:", socketError.message);
    }

    res.json({ ok: true, table, orders });
  } catch (error) {
    next(error);
  }
}

async function updateSettingsController(req, res, next) {
  try {
    const { restaurantId, ownerUpiId } = req.body;
    const resolvedRestaurantId = restaurantId || "1";
    
    const updated = await updateRestaurantSettings(resolvedRestaurantId, { ownerUpiId });
    res.json({ ok: true, restaurant: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  fetchRestaurantTables,
  fetchRestaurantOrders,
  loginRestaurant,
  modifyTableStatus,
  addTable,
  removeTable,
  checkoutTableController,
  updateSettingsController,
};
