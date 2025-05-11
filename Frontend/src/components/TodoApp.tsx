import { useState, useEffect } from "react";
import { CirclePlus, Trash2, BookOpen } from "lucide-react";
import axios from "axios";

interface Todo {
  _id?: string;
  title: string;
  status: boolean;
  createdAt?: Date;
  source?: "mongodb" | "redis";
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const websocket = new WebSocket("ws://localhost:8080");

    websocket.onopen = () => {
      console.log("Connected to server");
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "todo_added":
          setTodos((prev) => [...prev, data.todo]);
          break;
        case "todo_deleted":
          setTodos((prev) => prev.filter((todo) => todo._id !== data.todoId));
          break;
        case "todo_updated":
          setTodos((prev) =>
            prev.map((todo) => (todo._id === data.todo._id ? data.todo : todo))
          );
          break;
        case "mqtt_todo_added":
          setTodos((prev) => [...prev, data.todo]);
          break;
      }
    };

    websocket.onclose = () => {
      console.log("Disconnected from server");
    };

    setWs(websocket);

    fetchTodos();

    return () => {
      websocket.close();
    };
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:8080/todos/fetchAllTodos"
      );
      const allTodos = response.data.allTodos;

      // Add source property to identify where each todo comes from
      const redisTodos = allTodos.redisTodos.map((todo: Todo) => ({
        ...todo,
        source: "redis" as const,
      }));

      const mongoTodos = allTodos.mongoTodos.map((todo: Todo) => ({
        ...todo,
        source: "mongodb" as const,
      }));

      setTodos([...redisTodos, ...mongoTodos]);
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await axios.post("http://localhost:8080/todos/addTodo", {
        title: newTodo,
        status: false,
      });
      setNewTodo("");
    } catch (error) {
      console.error("Error adding todo:", error);
    }
  };

  const deleteTodo = async (todo: Todo) => {
    if (!todo._id) return;

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send delete request via WebSocket
        ws.send(
          JSON.stringify({
            type: "delete_todo",
            todoId: todo._id,
          })
        );
      } else {
        // Fallback to HTTP if WebSocket isn't available
        await axios.delete(
          `http://localhost:8080/todos/deleteTodo/${todo._id}`
        );
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      if (!todo._id) {
        console.error("Cannot update todo without ID");
        return;
      }

      await axios.put(`http://localhost:8080/todos/updateTodo/${todo._id}`, {
        ...todo,
        status: !todo.status,
      });
    } catch (error) {
      console.error("Error updating todo:", error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="bg-red-900 text-white p-2 rounded">
              <BookOpen size={20} />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Note App</h1>
          </div>
        </div>

        {/* Add Note Form */}
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={addTodo} className="flex gap-2">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="New Note..."
              className="flex-grow px-3 py-2 border rounded-md focus:outline-none focus:border-orange-500 text-sm"
            />
            <button
              type="submit"
              className="bg-red-900 text-white px-4 py-2 rounded-md hover:bg-red-900 transition-colors flex items-center gap-1"
            >
              <CirclePlus size={16} />
              Add
            </button>
          </form>
        </div>

        {/* Notes List with fixed height and scroll */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
            <span className="text-xs text-gray-500">{todos.length} total</span>
          </div>

          <div
            className={`space-y-2 ${
              todos.length > 3 ? "max-h-[300px] overflow-y-auto pr-2" : ""
            }`}
          >
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : todos.length > 0 ? (
              todos.map((todo, index) => (
                <div
                  key={todo._id || `${todo.title}-${index}`}
                  className="group py-3 px-3 border-b border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800">{todo.title}</span>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleString()}
                      {todo.source && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({todo.source})
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo)}
                    className="text-gray-400 hover:text-red-600 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                No notes yet. Add one above!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
