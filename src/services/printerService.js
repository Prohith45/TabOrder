const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const prisma = require("../db/prisma");
const env = require("../config/env");

/**
 * Formats and prints an order kitchen ticket using raw ESC/POS commands.
 * Under no circumstances does this function allow errors to bubble up and crash the server.
 * @param {Object} order The order object containing items, table, and restaurant info.
 */
async function printOrderTicket(order) {
  const isEnabled = env.printerEnabled;
  const printerType = env.printerType;
  const printerInterface = env.printerInterface;

  console.log(`[PrinterService] Initiating order ticket print job for Order ID: ${order.id}. (Enabled: ${isEnabled})`);

  try {
    if (!order || !order.restaurantId) {
      throw new Error("Invalid order data passed to print function");
    }

    // 1. Fetch the restaurant name if not included in the order object
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { name: true },
    });
    const restaurantName = restaurant ? restaurant.name : "TabOrder Restaurant";

    // 2. Initialize the ThermalPrinter instance
    const printerTypeEnum = PrinterTypes[printerType.toUpperCase()] || PrinterTypes.EPSON;
    const printer = new ThermalPrinter({
      type: printerTypeEnum,
      interface: printerInterface,
      width: 48, // Standard characters width for 80mm thermal printers
      characterSet: "PC437_USA",
      removeSpecialCharacters: false,
    });

    // 3. Layout formatting
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(restaurantName.toUpperCase());
    printer.bold(false);
    printer.println("================================================");
    printer.newLine();

    // Massive Table Number
    printer.setTextDoubleHeight();
    printer.setTextDoubleWidth();
    printer.bold(true);
    printer.println(`TABLE: ${order.table?.tableNumber ?? "N/A"}`);
    printer.setTextNormal();
    printer.bold(false);
    printer.newLine();

    // Timestamp & metadata
    printer.alignLeft();
    const formattedDate = new Date(order.createdAt).toLocaleString();
    printer.println(`Date/Time: ${formattedDate}`);
    printer.println(`Order ID : ${order.id}`);
    printer.println("------------------------------------------------");
    printer.newLine();

    // Items list header
    printer.bold(true);
    printer.println("ITEMS:");
    printer.bold(false);
    printer.newLine();

    // Print each item details
    order.items.forEach((item) => {
      // Double height quantity and name for extreme cook visibility
      printer.setTextDoubleHeight();
      printer.bold(true);
      printer.println(`${item.quantity} x ${item.menuItem?.name || "Unknown Item"}`);
      printer.setTextNormal();
      printer.bold(false);

      // Separate and highlight instructions if present
      if (item.specialInstructions && item.specialInstructions.trim()) {
        printer.newLine();
        printer.alignCenter();
        printer.println("************************************************");
        printer.bold(true);
        printer.println(`*** INSTRUCTION: ${item.specialInstructions.trim().toUpperCase()} ***`);
        printer.bold(false);
        printer.println("************************************************");
        printer.alignLeft();
      }
      printer.newLine();
    });

    printer.println("------------------------------------------------");
    printer.newLine();
    printer.alignCenter();
    printer.println("TabOrder System - Kitchen Copy");
    printer.newLine();
    
    // Cut receipt command
    printer.cut();

    // 4. Execution
    if (isEnabled) {
      console.log(`[PrinterService] Sending raw ESC/POS data to ${printerInterface}...`);
      await printer.execute();
      console.log(`[PrinterService] Successfully printed ticket for Order ID: ${order.id}`);
    } else {
      console.log("=== [PrinterService DRY RUN TICKET] ===");
      console.log(printer.getText());
      console.log("=========================================");
    }
  } catch (error) {
    // Graceful error recovery: log error but do not crash the server
    console.error(`[PrinterService Error] Failed to print order ticket for Order ID: ${order.id}:`, error.message);
  }
}

async function printCustomerBill(tableData, orderData, restaurantData) {
  const isEnabled = env.printerEnabled;
  const printerType = env.printerType;
  const printerInterface = env.printerInterface;

  console.log(`[PrinterService] Initiating customer bill print job for Table: ${tableData?.tableNumber}. (Enabled: ${isEnabled})`);

  try {
    if (!tableData) {
      throw new Error("Invalid table data passed to printCustomerBill function");
    }

    const rName = restaurantData?.name || "TabOrder Restaurant";

    // Initialize ThermalPrinter
    const printerTypeEnum = PrinterTypes[printerType.toUpperCase()] || PrinterTypes.EPSON;
    const printer = new ThermalPrinter({
      type: printerTypeEnum,
      interface: printerInterface,
      width: 48,
      characterSet: "PC437_USA",
      removeSpecialCharacters: false,
    });

    // Formatting Header
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.bold(true);
    printer.println(rName.toUpperCase());
    printer.bold(false);
    printer.println("================================================");
    printer.newLine();

    // Table Info
    printer.bold(true);
    printer.println(`TABLE: ${tableData.tableNumber}`);
    printer.bold(false);
    printer.println(`Status: BILL REQUESTED`);
    
    const formattedDate = new Date().toLocaleString();
    printer.println(`Date/Time: ${formattedDate}`);
    printer.println("------------------------------------------------");
    printer.newLine();

    // Align Left for items
    printer.alignLeft();
    
    // Helper to format rows beautifully on 48 character paper width
    const formatRow = (name, qty, price, amount) => {
      const padRight = (str, len) => str.padEnd(len, " ");
      const padLeft = (str, len) => str.padStart(len, " ");
      
      const partName = padRight(name.substring(0, 22), 22);
      const partQty = padLeft(qty.toString(), 4);
      const partPrice = padLeft(price, 10);
      const partAmount = padLeft(amount, 10);
      
      return `${partName} ${partQty} ${partPrice} ${partAmount}`;
    };

    printer.bold(true);
    printer.println(formatRow("ITEM", "QTY", "PRICE", "AMOUNT"));
    printer.bold(false);
    printer.println("------------------------------------------------");

    // Aggregate orders
    const orders = Array.isArray(orderData) ? orderData : [orderData];
    const consolidatedItems = {};
    let subtotal = 0;

    orders.forEach((order) => {
      if (!order || !order.items) return;
      order.items.forEach((item) => {
        const itemId = item.menuItemId;
        const name = item.menuItem?.name || "Unknown Item";
        const price = Number(item.menuItem?.price || 0);
        const qty = item.quantity;

        if (consolidatedItems[itemId]) {
          consolidatedItems[itemId].quantity += qty;
        } else {
          consolidatedItems[itemId] = {
            name,
            price,
            quantity: qty,
          };
        }
      });
    });

    Object.values(consolidatedItems).forEach((item) => {
      const amt = item.price * item.quantity;
      subtotal += amt;
      printer.println(
        formatRow(
          item.name,
          item.quantity,
          `INR ${item.price.toFixed(2)}`,
          `INR ${amt.toFixed(2)}`
        )
      );
    });

    printer.println("------------------------------------------------");
    
    // Summary
    const padSummary = (label, val) => {
      const spaces = 48 - label.length - val.length;
      return label + " ".repeat(spaces > 0 ? spaces : 1) + val;
    };

    const cgst = subtotal * 0.025;
    const sgst = subtotal * 0.025;
    const grandTotal = subtotal + cgst + sgst;

    printer.println(padSummary("Subtotal", `INR ${subtotal.toFixed(2)}`));
    printer.println(padSummary("CGST (2.5%)", `INR ${cgst.toFixed(2)}`));
    printer.println(padSummary("SGST (2.5%)", `INR ${sgst.toFixed(2)}`));
    printer.println("------------------------------------------------");
    
    printer.bold(true);
    printer.println(padSummary("GRAND TOTAL", `INR ${grandTotal.toFixed(2)}`));
    printer.bold(false);
    
    printer.println("------------------------------------------------");
    
    // Payment Method
    const paymentMethod = orders[0]?.paymentMethod || "NONE";
    printer.alignCenter();
    printer.bold(true);
    printer.println(`PAYMENT METHOD: ${paymentMethod}`);
    printer.bold(false);
    printer.newLine();
    printer.println("Thank you for dining with us!");
    printer.println("Please visit again!");
    printer.newLine();

    printer.cut();

    // Execution
    if (isEnabled) {
      console.log(`[PrinterService] Sending raw ESC/POS customer bill data to ${printerInterface}...`);
      await printer.execute();
      console.log(`[PrinterService] Successfully printed customer bill for Table: ${tableData.tableNumber}`);
    } else {
      console.log("=== [PrinterService DRY RUN CUSTOMER BILL] ===");
      console.log(printer.getText());
      console.log("===============================================");
    }
  } catch (error) {
    console.error(`[PrinterService Error] Failed to print customer bill for Table: ${tableData?.tableNumber}:`, error.message);
  }
}

module.exports = {
  printOrderTicket,
  printCustomerBill,
};
