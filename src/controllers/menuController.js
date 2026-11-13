const {
  getRestaurantMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require("../services/menuService");

async function fetchRestaurantMenu(req, res, next) {
  try {
    const menu = await getRestaurantMenu(req.params.restaurantId);
    res.json(menu);
  } catch (error) {
    next(error);
  }
}

async function addCategory(req, res, next) {
  try {
    const category = await createCategory(req.params.restaurantId, req.body);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

async function modifyCategory(req, res, next) {
  try {
    const category = await updateCategory(req.params.categoryId, req.body);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

async function removeCategory(req, res, next) {
  try {
    const result = await deleteCategory(req.params.categoryId);
    res.json({ ok: true, deleted: result });
  } catch (error) {
    next(error);
  }
}

async function addItemToCategory(req, res, next) {
  try {
    const item = await createMenuItem(req.params.categoryId, req.body);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

async function modifyMenuItem(req, res, next) {
  try {
    const item = await updateMenuItem(req.params.itemId, req.body);
    res.json(item);
  } catch (error) {
    next(error);
  }
}

async function removeMenuItem(req, res, next) {
  try {
    const result = await deleteMenuItem(req.params.itemId);
    res.json({ ok: true, deleted: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  fetchRestaurantMenu,
  addCategory,
  modifyCategory,
  removeCategory,
  addItemToCategory,
  modifyMenuItem,
  removeMenuItem,
};
