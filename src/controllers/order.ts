import { Request } from "express";
import { TryCatch } from "../middlewares/error.js";
import { NewOrderRequestBody } from "../types/types.js";
import { Order } from "../models/order.js";
import { invalidateCache, reduceStock } from "../utils/features.js";
import ErrorHandler from "../utils/utility-class.js";
import { myCache } from "../app.js";
import sendEmail from "../utils/sendEmail.js";
export const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `my-orders-${user}`;

  let orders = [];

  if (myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
  else {
    orders = await Order.find({ user });
    myCache.set(key, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  const key = `all-orders`;

  let orders = [];

  if (myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
  else {
    orders = await Order.find().populate("user", "name");
    myCache.set(key, JSON.stringify(orders));
  }
  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;

  let order;

  if (myCache.has(key)) order = JSON.parse(myCache.get(key) as string);
  else {
    order = await Order.findById(id).populate("user", "name");

    if (!order) return next(new ErrorHandler("Order Not Found", 404));

    myCache.set(key, JSON.stringify(order));
  }
  return res.status(200).json({
    success: true,
    order,
  });
});

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total)
      return next(new ErrorHandler("Please Enter All Fields", 400));

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    const orderItemsHtml = Object.values(orderItems).map(item => `
    <img src="https://luxify-yhhu.onrender.com/${item.photo}" alt="product" style="width:40px;height:40px;border-radius:50%;" />
  <p>
    <strong>Name:</strong> ${item.name} </br>
    <strong>Price:</strong> ${item.price} </br>
    <strong>Quantity:</strong> ${item.quantity} </br>
  </p>
`).join('');
    const message = `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333;">Thank you for your order!</h2>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h3 style="color: #333;">Order Details:</h3>
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
          <p style="margin: 5px 0;"><strong>Order Status:</strong> ${order.status}</p>
          <p style="margin: 5px 0;"><strong>Shipping Address:</strong> ${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state}, ${shippingInfo.country}, ${shippingInfo.pinCode}</p>
        </div>
        <div style="background-color: #fff; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <h3 style="color: #333;">Order Items:</h3>
          <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; margin-bottom: 10px;">
            ${orderItemsHtml}
          </div>
        </div>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 15px;">
          <p style="margin: 5px 0;"><strong>Shipping Charges:</strong> ${shippingCharges}</p>
          <p style="margin: 5px 0;"><strong>Discount:</strong> ${discount}</p>
          <p style="margin: 5px 0;"><strong>Grand Total:</strong> ${total}</p>
        </div>
      </div>
    `;
    
    
    try {
      await sendEmail({
        email: user.email,
        subject: `Order Confirmation`,
        
        html: message,
      });
    }
     catch{
      console.log("Email not sent");
     } 

    invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user._id,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: "Order Placed Successfully",
    });
  
  });

export const processOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id);

  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  switch (order.status) {
    case "Processing":
      order.status = "Shipped";
      break;
    case "Shipped":
      order.status = "Delivered";
      break;
    default:
      order.status = "Delivered";
      break;
  }

  await order.save();

  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order Processed Successfully",
  });
});

export const deleteOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const order = await Order.findById(id);
  if (!order) return next(new ErrorHandler("Order Not Found", 404));

  await order.deleteOne();

  invalidateCache({
    product: false,
    order: true,
    admin: true,
    userId: order.user,
    orderId: String(order._id),
  });

  return res.status(200).json({
    success: true,
    message: "Order Deleted Successfully",
  });
});