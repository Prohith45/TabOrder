const { Server } = require("socket.io");
const { getRestaurantRoom } = require("./restaurantRoom");

let io;

function initSocketServer(httpServer, options = {}) {
  io = new Server(httpServer, {
    cors: {
      origin: options.corsOrigin || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.emit("connection_ready", {
      socketId: socket.id,
    });

    socket.on("join_restaurant", (payload = {}, callback) => {
      try {
        const restaurantId = String(payload.restaurantId || "").trim();

        if (!restaurantId) {
          const errorPayload = {
            ok: false,
            message: "restaurantId is required to join a room",
          };

          if (typeof callback === "function") {
            callback(errorPayload);
            return;
          }

          socket.emit("room_join_error", errorPayload);
          return;
        }

        const nextRoom = getRestaurantRoom(restaurantId);
        const previousRoom = socket.data.restaurantRoom;

        if (previousRoom && previousRoom !== nextRoom) {
          socket.leave(previousRoom);
        }

        socket.join(nextRoom);
        socket.data.restaurantRoom = nextRoom;

        const successPayload = {
          ok: true,
          restaurantId,
          room: nextRoom,
        };

        if (typeof callback === "function") {
          callback(successPayload);
          return;
        }

        socket.emit("room_joined", successPayload);
      } catch (error) {
        const errorPayload = {
          ok: false,
          message: "Unable to join restaurant room",
        };

        if (typeof callback === "function") {
          callback(errorPayload);
          return;
        }

        socket.emit("room_join_error", errorPayload);
      }
    });
  });

  return io;
}

function emitNewOrderToRestaurant(order) {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized");
  }

  if (!order || !order.restaurantId) {
    throw new Error("Order restaurantId is required for emission");
  }

  io.to(getRestaurantRoom(order.restaurantId)).emit("new_order", order);
}

function emitOrderUpdateToRestaurant(order) {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized");
  }

  if (!order || !order.restaurantId) {
    throw new Error("Order restaurantId is required for emission");
  }

  io.to(getRestaurantRoom(order.restaurantId)).emit("order_updated", order);
}

function emitTableUpdateToRestaurant(restaurantId, table) {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized");
  }

  if (!restaurantId) {
    throw new Error("restaurantId is required for emission");
  }

  io.to(getRestaurantRoom(restaurantId)).emit("table_updated", table);
}

module.exports = {
  initSocketServer,
  emitNewOrderToRestaurant,
  emitOrderUpdateToRestaurant,
  emitTableUpdateToRestaurant,
};
