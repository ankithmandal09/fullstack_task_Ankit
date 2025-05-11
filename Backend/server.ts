import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import TodoRouter from "./routers/todo.router";
import connectToDB from "./config/db.config";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { connect } from "mqtt";
import Redis from "ioredis";
import TodoModel from "./models/todo.model";

dotenv.config();

const app = express();
const httpServer = createServer(app);
export const wss = new WebSocketServer({ server: httpServer });

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 8080;

// Redis client setup
export const redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

// MQTT client setup
export const mqttClient = connect(
  process.env.MQTT_BROKER_URL || "mqtt://127.0.0.1:1883"
);
const FIRST_NAME = process.env.YOUR_FIRST_NAME;
export const REDIS_KEY = `FULLSTACK_TASK_${FIRST_NAME}`;

// Set up Redis event handlers
redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// MQTT event handlers and subscription
mqttClient.on("connect", () => {
  console.log("Connected to MQTT broker");
  mqttClient.subscribe("/add", (err) => {
    if (err) {
      console.error("Error subscribing to /add topic:", err);
    } else {
      console.log("Subscribed to /add topic");
    }
  });
});

mqttClient.on("error", (err) => {
  console.error("MQTT connection error:", err);
});

mqttClient.on("message", async (topic, message) => {
  if (topic === "/add") {
    try {
      const todoContent = message.toString();
      console.log(`New todo received: ${todoContent}`);

      let todoString = await redisClient.get(REDIS_KEY);
      let todos = [];

      if (todoString) {
        todos = JSON.parse(todoString);
      }

      todos.push(todoContent);

      if (todos.length > 50) {
        console.log("Threshold reached. Moving all todos to MongoDB...");

        await moveTasksToMongoDB(todos);

        await redisClient.del(REDIS_KEY);
        console.log("Redis cleared successfully");
        todos = [];

        console.log("All todos moved to MongoDB and Redis cleared");
      }

      await redisClient.set(REDIS_KEY, JSON.stringify(todos));
      console.log(`Todo added to Redis. Total todos: ${todos.length}`);

      // Broadcast the new todo to all connected clients
      broadcastMessage({
        type: "mqtt_todo_added",
        todo: {
          title: todoContent,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error("Error handling MQTT message:", error);
    }
  }
});

async function moveTasksToMongoDB(todos: any[]) {
  try {
    if (!todos.length) return;

    const todoObjects = todos.map((todo: any) => ({
      title: typeof todo === "string" ? todo : todo.title || "Untitled",
      description:
        typeof todo === "string"
          ? `Task added via MQTT: ${todo}`
          : todo.description || "No description",
      priority: typeof todo === "string" ? "medium" : todo.priority || "medium",
    }));

    const result = await TodoModel.insertMany(todoObjects);
    console.log(`Successfully moved ${result.length} todos to MongoDB`);
    return result;
  } catch (error) {
    console.error("Error moving tasks to MongoDB:", error);
    throw error;
  }
}

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case "new_todo":
          const newTodo = new TodoModel(message.todo);
          await newTodo.save();
          broadcastMessage({ type: "todo_added", todo: newTodo });
          break;

        case "delete_todo":
          await TodoModel.findByIdAndDelete(message.id);
          broadcastMessage({ type: "todo_deleted", todoId: message.id });
          break;

        case "update_todo":
          const updatedTodo = await TodoModel.findByIdAndUpdate(
            message.id,
            { status: message.status },
            { new: true }
          );
          broadcastMessage({ type: "todo_updated", todo: updatedTodo });
          break;
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Helper function to broadcast messages to all clients
function broadcastMessage(message: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

app.use("/todos", TodoRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ msg: "Request Not Found" });
});

httpServer.listen(PORT, () => {
  connectToDB();
  console.log(`Server Started at port ${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully");

  try {
    // Close WebSocket server
    wss.close(() => {
      console.log("WebSocket server closed");
    });

    // Close Redis connection
    await redisClient.quit();
    console.log("Redis connection closed");

    // Close MQTT connection
    mqttClient.end(true, () => {
      console.log("MQTT connection closed");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});
