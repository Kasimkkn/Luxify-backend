import mongoose from "mongoose";


interface IProduct extends Document {
  name: string;
  photo: string;
  price: number;
  stock: number;
  description: string;
  category: string;
  color : string;
  size:number[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter Name"],
    },
    description: {
      type: String,
      required: [true, "Please enter Product Description"],
      
    },
    photo: {
      type: String,
      required: [true, "Please enter Photo"],
    },
    price: {
      type: Number,
      required: [true, "Please enter Price"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter Stock"],
    },
    color :{
       type : String,
       required: [true , "please enter a color"]
    },
    size:{
         type : [Number],
         default : [5,6,7,8,9]
    },
    category: {
      type: String,
      required: [true, "Please enter Category"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProduct>("Product", schema);