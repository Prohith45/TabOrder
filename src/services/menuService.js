const prisma = require("../db/prisma");
const httpError = require("../utils/httpError");

async function getRestaurantMenu(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      ownerUpiId: true,
      categories: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          menuItems: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              price: true,
              isAvailable: true,
            },
          },
        },
      },
    },
  });

  if (!restaurant) {
    throw httpError(404, "Restaurant not found");
  }

  return restaurant;
}

async function createCategory(restaurantId, { name }) {
  if (!restaurantId || !name?.trim()) {
    throw httpError(400, "Restaurant ID and Category name are required");
  }
  try {
    return await prisma.category.create({
      data: {
        restaurantId,
        name: name.trim(),
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw httpError(409, "A category with this name already exists in this restaurant");
    }
    throw error;
  }
}

async function updateCategory(categoryId, { name }) {
  if (!categoryId || !name?.trim()) {
    throw httpError(400, "Category ID and name are required");
  }
  try {
    return await prisma.category.update({
      where: { id: categoryId },
      data: { name: name.trim() },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw httpError(409, "A category with this name already exists in this restaurant");
    }
    if (error.code === "P2025") {
      throw httpError(404, "Category not found");
    }
    throw error;
  }
}

async function deleteCategory(categoryId) {
  if (!categoryId) {
    throw httpError(400, "Category ID is required");
  }
  try {
    return await prisma.category.delete({
      where: { id: categoryId },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw httpError(404, "Category not found");
    }
    if (error.code === "P2003") {
      throw httpError(400, "Cannot delete category because it contains items with active orders");
    }
    throw error;
  }
}

async function createMenuItem(categoryId, { name, price, isAvailable = true }) {
  if (!categoryId || !name?.trim() || price === undefined) {
    throw httpError(400, "Category ID, item name, and price are required");
  }
  const numericPrice = Number(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    throw httpError(400, "Price must be a valid positive number");
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId }
  });
  if (!category) {
    throw httpError(404, "Category not found");
  }

  return await prisma.menuItem.create({
    data: {
      categoryId,
      name: name.trim(),
      price: numericPrice,
      isAvailable: Boolean(isAvailable),
    },
  });
}

async function updateMenuItem(itemId, { name, price, isAvailable }) {
  if (!itemId) {
    throw httpError(400, "Item ID is required");
  }
  const data = {};
  if (name !== undefined) {
    if (!name.trim()) throw httpError(400, "Item name cannot be empty");
    data.name = name.trim();
  }
  if (price !== undefined) {
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      throw httpError(400, "Price must be a valid positive number");
    }
    data.price = numericPrice;
  }
  if (isAvailable !== undefined) {
    data.isAvailable = Boolean(isAvailable);
  }

  try {
    return await prisma.menuItem.update({
      where: { id: itemId },
      data,
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw httpError(404, "Item not found");
    }
    throw error;
  }
}

async function deleteMenuItem(itemId) {
  if (!itemId) {
    throw httpError(400, "Item ID is required");
  }
  try {
    return await prisma.menuItem.delete({
      where: { id: itemId },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw httpError(404, "Item not found");
    }
    if (error.code === "P2003") {
      throw httpError(409, "Cannot delete item because it has historical order records. Please set it to unavailable instead.");
    }
    throw error;
  }
}

module.exports = {
  getRestaurantMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
