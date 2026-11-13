const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

async function authenticateRestaurant(passkey) {
  if (!passkey || typeof passkey !== "string") {
    throw httpError(400, "Passkey is required");
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { passkey },
    select: {
      id: true,
      name: true,
    },
  });

  if (!restaurant) {
    throw httpError(401, "Invalid passkey");
  }

  return restaurant;
}

async function getTables(restaurantId) {
  if (!restaurantId) {
    throw httpError(400, "restaurantId is required");
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: "asc" },
  });

  return tables;
}

async function updateTableStatus(restaurantId, tableNumber, status) {
  if (!restaurantId || !Number.isInteger(tableNumber)) {
    throw httpError(400, "restaurantId and tableNumber are required");
  }
  
  if (status !== "EMPTY" && status !== "ACTIVE" && status !== "BILL_REQUESTED") {
    throw httpError(400, "Invalid table status");
  }

  const table = await prisma.table.findUnique({
    where: {
      restaurantId_tableNumber: {
        restaurantId,
        tableNumber,
      },
    },
  });

  if (!table) {
    throw httpError(404, "Table not found");
  }

  const { updatedTable, updatedOrders } = await prisma.$transaction(async (tx) => {
    const tbl = await tx.table.update({
      where: { id: table.id },
      data: {
        status,
        ...(status === "EMPTY" ? {
          currentSessionToken: null,
          sessionExpiresAt: null,
        } : {})
      },
    });

    let orders = [];
    if (status === "EMPTY") {
      // Get the IDs of all currently unpaid orders for this table
      const unpaidOrders = await tx.order.findMany({
        where: {
          tableId: table.id,
          restaurantId,
          paymentStatus: "UNPAID",
        },
        select: { id: true },
      });
      const orderIds = unpaidOrders.map((o) => o.id);

      if (orderIds.length > 0) {
        // Mark them as PAID and COMPLETED
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            paymentStatus: "PAID",
            status: "COMPLETED",
          },
        });

        // Fetch fully populated updated orders to return
        orders = await tx.order.findMany({
          where: {
            id: { in: orderIds },
          },
          include: {
            table: {
              select: {
                tableNumber: true,
              },
            },
            items: {
              include: {
                menuItem: {
                  select: {
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        });
      }
    }

    return { updatedTable: tbl, updatedOrders: orders };
  });

  return { table: updatedTable, orders: updatedOrders };
}

async function getOrders(restaurantId) {
  if (!restaurantId) {
    throw httpError(400, "restaurantId is required");
  }

  const orders = await prisma.order.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    include: {
      table: {
        select: {
          tableNumber: true,
        },
      },
      items: {
        include: {
          menuItem: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  return orders;
}

async function createTable(restaurantId, { tableNumber }) {
  if (!restaurantId || tableNumber === undefined) {
    throw httpError(400, "restaurantId and tableNumber are required");
  }

  const num = Number(tableNumber);
  if (!Number.isInteger(num) || num <= 0) {
    throw httpError(400, "Table number must be a valid positive integer");
  }

  try {
    return await prisma.table.create({
      data: {
        restaurantId,
        tableNumber: num,
        status: "EMPTY",
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw httpError(400, "Table number already exists.");
    }
    throw error;
  }
}

async function deleteTable(tableId) {
  if (!tableId) {
    throw httpError(400, "tableId is required");
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      orders: {
        where: {
          status: { in: ["PENDING", "PREPARING"] },
        },
      },
    },
  });

  if (!table) {
    throw httpError(404, "Table not found");
  }

  if (table.status === "ACTIVE" || table.orders.length > 0) {
    throw httpError(400, "Cannot delete table because it currently has active orders.");
  }

  try {
    return await prisma.table.delete({
      where: { id: tableId },
    });
  } catch (error) {
    if (error.code === "P2003") {
      throw httpError(400, "Cannot delete table because it has historical order records.");
    }
    throw error;
  }
}

async function checkoutTable(tableId, { paymentMethod, transactionId }) {
  if (!tableId || !paymentMethod) {
    throw httpError(400, "tableId and paymentMethod are required");
  }

  if (paymentMethod !== "CASH" && paymentMethod !== "UPI") {
    throw httpError(400, "Invalid payment method. Options are: CASH, UPI");
  }

  const table = await prisma.table.findUnique({
    where: { id: tableId },
  });

  if (!table) {
    throw httpError(404, "Table not found");
  }

  // Find all unpaid orders for this table
  const unpaidOrders = await prisma.order.findMany({
    where: {
      tableId,
      paymentStatus: "UNPAID",
    },
    include: {
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (unpaidOrders.length === 0) {
    throw httpError(400, "No active unpaid orders found for this table");
  }

  // Update table status to BILL_REQUESTED and active orders' payment method and transaction ID
  const { updatedTable, updatedOrders } = await prisma.$transaction(async (tx) => {
    const tbl = await tx.table.update({
      where: { id: tableId },
      data: { status: "BILL_REQUESTED" },
    });

    await tx.order.updateMany({
      where: {
        tableId,
        paymentStatus: "UNPAID",
      },
      data: {
        paymentMethod,
        transactionId: transactionId || null,
      },
    });

    const orders = await tx.order.findMany({
      where: {
        tableId,
        paymentStatus: "UNPAID",
      },
      include: {
        table: {
          select: {
            tableNumber: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return { updatedTable: tbl, updatedOrders: orders };
  });

  return { table: updatedTable, orders: updatedOrders };
}

async function updateRestaurantSettings(restaurantId, { ownerUpiId }) {
  if (!restaurantId) {
    throw httpError(400, "restaurantId is required");
  }
  if (!ownerUpiId || typeof ownerUpiId !== "string" || !ownerUpiId.trim()) {
    throw httpError(400, "ownerUpiId must be a non-empty string");
  }

  const updatedRestaurant = await prisma.restaurant.update({
    where: { id: restaurantId },
    data: { ownerUpiId: ownerUpiId.trim() },
    select: {
      id: true,
      name: true,
      ownerUpiId: true,
    },
  });

  return updatedRestaurant;
}

module.exports = {
  authenticateRestaurant,
  getTables,
  updateTableStatus,
  getOrders,
  createTable,
  deleteTable,
  checkoutTable,
  updateRestaurantSettings,
};
