import express from "express";
import TodoModel, { ITodo } from "../models/todo.model";
import { REDIS_KEY, redisClient, wss } from "../server";
import { Request, Response } from "express";
import { WebSocket } from "ws";

const TodoRouter = express.Router();

// Helper function to broadcast messages to all WebSocket clients
const broadcastMessage = (message: any) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
};

TodoRouter.post("/addTodo", async (req, res) => {
  try {
    let todosString = await redisClient.get(REDIS_KEY);
    let todos = [];

    if (todosString) {
      todos = JSON.parse(todosString);
    }

    todos.push(req.body);
    await redisClient.set(REDIS_KEY, JSON.stringify(todos));

    // Broadcast to WebSocket clients
    broadcastMessage({
      type: "todo_added",
      todo: req.body,
      source: "redis",
      todoCount: todos.length,
    });

    res
      .status(201)
      .json({ msg: "Todo added successfully", todoCount: todos.length });
  } catch (error) {
    res.status(500).json({ msg: "Failed to add todo", error });
  }
});

TodoRouter.get("/fetchAllTodos", async (req, res) => {
  try {
    let redisTodos = [];
    const todosString = await redisClient.get(REDIS_KEY);

    if (todosString) {
      redisTodos = JSON.parse(todosString);
    }

    const mongoTodos = await TodoModel.find();
    const allTodos = {
      redisTodos,
      mongoTodos,
      totalCount: redisTodos.length + mongoTodos.length,
    };

    // Broadcast current state to WebSocket clients
    broadcastMessage({
      type: "todos_state",
      data: allTodos,
    });

    res.status(200).json({ msg: "All todos fetched successfully", allTodos });
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch todos", error });
  }
});

TodoRouter.delete("/deleteTodo/:id",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // Try MongoDB first
      const deletedTodo = await TodoModel.findByIdAndDelete(id);

      if (deletedTodo) {
        broadcastMessage({
          type: "todo_deleted",
          todoId: id,
          source: "mongodb",
        });
        res
          .status(200)
          .json({ msg: "Todo deleted successfully", deletedTodo });
      }

      // Try Redis if not found in MongoDB
      let todosString = await redisClient.get(REDIS_KEY);
      if (todosString) {
        let todos = JSON.parse(todosString);
        const filteredTodos = todos.filter((todo: any) => todo.title !== id);

        if (todos.length !== filteredTodos.length) {
          await redisClient.set(REDIS_KEY, JSON.stringify(filteredTodos));
          broadcastMessage({
            type: "todo_deleted",
            todoId: id,
            source: "redis",
          });
          res
            .status(200)
            .json({ msg: "Todo deleted from Redis successfully" });
        }
      }

      res
        .status(404)
        .json({ msg: "Todo not found in either MongoDB or Redis" });
    } catch (error) {
      res.status(400).json({ msg: "Error deleting todo", error });
    }
  }
);

TodoRouter.put("/updateTodo/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTodo = await TodoModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    if (updatedTodo) {
      broadcastMessage({
        type: "todo_updated",
        todo: updatedTodo,
        source: "mongodb",
      });
    }

    res.status(200).json({ msg: "Todo updated successfully", updatedTodo });
  } catch (error) {
    res
      .status(400)
      .json({ msg: "Something went wrong while updating the todo", error });
  }
});

export default TodoRouter;
