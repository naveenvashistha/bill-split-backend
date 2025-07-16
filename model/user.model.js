import { Schema, model } from "mongoose";

const userSchema = new Schema({
  code: { type: String, required: true, index: true, unique: true },
  topic: String,
  billsplit: Array,
});

const User = model("User", userSchema);

export default User;
