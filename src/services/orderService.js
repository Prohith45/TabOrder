const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw httpError(400, "At least one order item is required");
  }

  return items.map((item) => {
    const quantity = Number(item.quantity);

    if (!item.menuItemId || !Number.isInteger(quantity) || quantity <= 0) {
      throw httpError(400, "Each item must include a valid menuItemId and quantity");
    }

    return {
      menuItemId: item.menuItemId,
      quantity,
      specialInstructions: item.specialInstructions?.trim() || null,
    };
  });
}

async function createOrder({ restaurantId, tableNumber, items }) {
  if (!restaurantId || !Number.isInteger(Number(tableNumber))) {
    throw httpError(400, "restaurantId and tableNumber are required");
  }

  const normalizedTableNumber = Number(tableNumber);
  const normalizedItems = normalizeOrderItems(items);

  const table = await prisma.table.findUnique({
    where: {
      restaurantId_tableNumber: {
        restaurantId,
        tableNumber: normalizedTableNumber,
      },
    },
  });

  if (!table) {
    throw httpError(404, "Table not found for this restaurant");
  }

  const menuItemIds = normalizedItems.map((item) => item.menuItemId);
  const uniqueMenuItemIds = [...new Set(menuItemIds)];
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: uniqueMenuItemIds },
      isAvailable: true,
      category: {
        restaurantId,
      },
    },
    select: {
      id: true,
      name: true,
      price: true,
    },
  });

  if (menuItems.length !== uniqueMenuItemIds.length) {
    throw httpError(400, "One or more menu items are invalid or unavailable");
  }

  const menuItemMap = new Map(menuItems.map((menuItem) => [menuItem.id, menuItem]));
  const totalAmount = normalizedItems.reduce((total, item) => {
    const menuItem = menuItemMap.get(item.menuItemId);
    return total + Number(menuItem.price) * item.quantity;
  }, 0);

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        restaurantId,
        tableId: table.id,
        totalAmount,
        items: {
          create: normalizedItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions,
          })),
        },
      },
      include: {
        table: {
          select: {
            id: true,
            tableNumber: true,
          },
        },
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
    });

    await tx.table.update({
      where: { id: table.id },
      data: { status: "ACTIVE" },
    });

    return createdOrder;
  });

  return order;
}

async function confirmOrder(orderId) {
  if (!orderId) {
    throw httpError(400, "orderId is required");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw httpError(404, "Order not found");
  }

  if (order.status !== "PENDING") {
    throw httpError(400, `Order cannot be confirmed because it is in status: ${order.status}`);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: "PREPARING" },
    include: {
      table: {
        select: {
          id: true,
          tableNumber: true,
        },
      },
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      },
    },
  });

  return updatedOrder;
}

module.exports = {
  createOrder,
  confirmOrder,
};
