import { Schema, model, Document} from "mongoose";

export interface ITodo extends Document {
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
}

const todoSchema = new Schema<ITodo>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
  },
);

const TodoModel = model<ITodo>("Todo", todoSchema);

export default TodoModel;
