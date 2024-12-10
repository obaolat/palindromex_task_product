import React, { useState, useEffect } from "react";
import axios from "axios";
import GraphVisualization from './components/GraphVisualization';

import "./App.css";

function App() {
  // State for tasks and products
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);

  // State for form inputs (tasks)
  const [taskName, setTaskName] = useState("");
  const [taskLevel, setTaskLevel] = useState(1);
  const [taskStartTime, setTaskStartTime] = useState("");
  const [taskEndTime, setTaskEndTime] = useState("");
  const [taskCost, setTaskCost] = useState("");

const [selectedInputTask, setSelectedInputTask] = useState(""); // For the selected input task
const [selectedOutputTask, setSelectedOutputTask] = useState(""); // For the selected output task


  // State for form inputs (products)
  const [productName, setProductName] = useState("");
  const [productCreationTime, setProductCreationTime] = useState("");
  const [productCost, setProductCost] = useState("");

  // Fetch tasks and products from Flask backend
  useEffect(() => {
    // Fetch tasks
    axios
      .get("http://localhost:5000/tasks")
      .then((response) => {
        console.log("Fetched tasks:", response.data); // Debug output
        setTasks(response.data);
      })
      .catch((error) => console.error("Error fetching tasks:", error));
  
    // Fetch products
    axios
      .get("http://localhost:5000/products")
      .then((response) => {
        console.log("Fetched products:", response.data); // Debug output
        setProducts(response.data);
      })
      .catch((error) => console.error("Error fetching products:", error));
  }, []);
  // Handle task form submission
  const handleTaskSubmit = async (e) => {
  e.preventDefault();

  const newTask = {
    name: taskName,
    level: taskLevel,
    start_time: taskStartTime,
    end_time: taskEndTime,
    cost: taskCost,
  };

  try {
    const response = await axios.post("http://localhost:5000/tasks", newTask);
    setTasks([...tasks, response.data]); 
    resetTaskForm(); 
  } catch (error) {
    console.error("Error creating task:", error);
  }
};


  // Reset task form
  const resetTaskForm = () => {
    setTaskName("");
    setTaskLevel(1);
    setTaskStartTime("");
    setTaskEndTime("");
    setTaskCost("");
  };

  // Handle product form submission
  const handleProductSubmit = async (e) => {
    e.preventDefault();

    const newProduct = {
      name: productName,
      creation_time: productCreationTime,
      cost: productCost,
      input_task_id:selectedInputTask,
      output_task_id: selectedOutputTask
    }
    try {
      const newProduct = {
        name: productName,
        creation_time: productCreationTime,
        cost: productCost,
      };
      const response = await axios.post("http://localhost:5000/products", newProduct);
      setProducts([...products, response.data]); // Update products state
      resetProductForm(); // Clear form inputs
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  // Reset product form
  const resetProductForm = () => {
    setProductName("");
    setProductCreationTime("");
    setProductCost("");
  };

  return (
    <div className="App">
      <h1>Task Manager with Visualization</h1>

      {/* Task Form */}
      <div className="form-container">
        <h2>Create Task</h2>
        <form onSubmit={handleTaskSubmit}>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Task Name"
            required
          />
          <input
            type="number"
            value={taskLevel}
            onChange={(e) => setTaskLevel(e.target.value)}
            placeholder="Task Level"
            min="1"
            required
          />
          <input
            type="datetime-local"
            value={taskStartTime}
            onChange={(e) => setTaskStartTime(e.target.value)}
            required
          />
          <input
            type="datetime-local"
            value={taskEndTime}
            onChange={(e) => setTaskEndTime(e.target.value)}
            required
          />
          <input
            type="number"
            value={taskCost}
            onChange={(e) => setTaskCost(e.target.value)}
            placeholder="Task Cost"
            required
          />
          <button type="submit">Add Task</button>
        </form>
      </div>

      {/* Product Form */}
      // Render Select Inputs for input_task_id and output_task_id
      <div className="form-container">
  <h2>Create Product</h2>
  <form onSubmit={handleProductSubmit}>
    <input
      type="text"
      value={productName}
      onChange={(e) => setProductName(e.target.value)}
      placeholder="Product Name"
      required
    />
    <input
      type="datetime-local"
      value={productCreationTime}
      onChange={(e) => setProductCreationTime(e.target.value)}
      required
    />
    <input
      type="number"
      value={productCost}
      onChange={(e) => setProductCost(e.target.value)}
      placeholder="Product Cost"
      required
    />

    {/* Input Task Selection */}
    <select onChange={(e) => setSelectedInputTask(e.target.value)} required>
      <option value="">Select Input Task</option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.name}
        </option>
      ))}
    </select>

    {/* Output Task Selection */}
    <select onChange={(e) => setSelectedOutputTask(e.target.value)} required>
      <option value="">Select Output Task</option>
      {tasks.map((task) => (
        <option key={task.id} value={task.id}>
          {task.name}
        </option>
      ))}
    </select>

    <button type="submit">Add Product</button>
  </form>
</div>



      {/* Visualization Component */}
      <GraphVisualization tasks={tasks} products={products} />
    </div>
  );
}

export default App;
