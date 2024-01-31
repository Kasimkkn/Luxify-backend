import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";


// check admin is there or not
export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  if (!id) return next(new ErrorHandler("login Please !", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid Credential", 401));
  if (user.role !== "admin")
    return next(new ErrorHandler("Only Admin Can Access ", 403));

  next();
});
