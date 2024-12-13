import React, { useState, useEffect } from "react";
import axios from "axios";
import "./style/style.css";
import ProductOval from "./components/ProductOval";

const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:5000", // Flask backend URL
});

function App() {
  const [tasks, setTasks] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [taskDeployments, setTaskDeployments] = useState({}); 
  const [selectedTask, setSelectedTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false); 
  const [showProductsTable, setShowProductsTable] = useState(false);
  const [showTimes, setShowTimes] = useState(false); 
  const [showProducts, setShowProducts] = useState(false); 
  const [showSettingsRight, setShowSettingsRight] = useState(false); 
  const [showProductsRight, setShowProductsRight] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");

  const [newTask, setNewTask] = useState({ name: "", start_time: "", end_time: "", cost: "", currency: "USD" });
  const [newProduct, setNewProduct] = useState({ name: "", creation_time: "", cost: "", currency: "USD" });


  useEffect(() => {
    fetchTasks();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchTaskDeployments(selectedTask.id);
    }
  }, [selectedTask]);

  const fetchTasks = async () => {
    try {
      const response = await axiosInstance.get("/api/tasks");
      setTasks(response.data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get("/api/products");
      setProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  

  const fetchTaskDeployments = async (taskId) => {
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}/products`);
      setTaskDeployments((prev) => ({
        ...prev,
        [taskId]: response.data, // Replace existing task deployments with fresh data
      }));
    } catch (error) {
      console.error("Error fetching task deployments:", error);
    }
  };
  

  const handleTaskCreation = async () => {
    try {
      await axiosInstance.post("/api/tasks", newTask);
      fetchTasks();
      setNewTask({ name: "", start_time: "", end_time: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleProductCreation = async () => {
    try {
      await axiosInstance.post("/api/products", newProduct);
      fetchProducts();
      if (selectedTask) fetchTaskDeployments(selectedTask.id); // Update deployments dynamically
      setNewProduct({ name: "", creation_time: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  const toggleDeployment = async (productId, deploymentType) => {
    if (!selectedTask) return;
  
    try {
      await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products/${productId}`, {
        type: deploymentType, // Specify whether to toggle input or output deployment
      });
  
      // Refetch the task deployments after toggling to ensure state consistency
      fetchTaskDeployments(selectedTask.id);
    } catch (error) {
      console.error("Error toggling deployment:", error);
    }
  };
  
  

  const toggleSettings = () => {
    setShowSettings((prev) => {
      if (!prev) setShowProducts(false); // Ensure ovals are hidden when settings are shown
      return !prev;
    });
  };

  const toggleProducts = () => {
    setShowProducts((prev) => {
      if (!prev) setShowSettings(false); // Ensure settings table is hidden when ovals are shown
      return !prev;
    });
  };

  const toggleSettingsRight = () => {
    setShowSettingsRight((prev) => {
      if (!prev) setShowProductsRight(false); // Ensure output ovals are hidden when settings are shown
      return !prev;
    });
  };

  const toggleProductsRight = () => {
    setShowProductsRight((prev) => {
      if (!prev) setShowSettingsRight(false); // Ensure output settings table is hidden when output ovals are shown
      return !prev;
    });
  };

  return (
    <div className="app-container">
      <h1>Interactive Task and Product Diagram</h1>

      {/* Task and Product Creation */}
      <div className="creation-forms">
        <div className="task-creation-form">
          <h2>Create Task</h2>
          <input
            type="text"
            placeholder="Task Name"
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="Start Time"
            value={newTask.start_time}
            onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="End Time"
            value={newTask.end_time}
            onChange={(e) => setNewTask({ ...newTask, end_time: e.target.value })}
          />
          <input
            type="number"
            placeholder="Cost"
            value={newTask.cost}
            onChange={(e) => setNewTask({ ...newTask, cost: e.target.value })}
          />
          <select
            value={newTask.currency}
            onChange={(e) => setNewTask({ ...newTask, currency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <button onClick={handleTaskCreation}>Create Task</button>
        </div>

        <div className="product-creation-form">
          <h2>Create Product</h2>
          <input
            type="text"
            placeholder="Product Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
          <input
            type="datetime-local"
            placeholder="Creation Time"
            value={newProduct.creation_time}
            onChange={(e) => setNewProduct({ ...newProduct, creation_time: e.target.value })}
          />
          <input
            type="number"
            placeholder="Cost"
            value={newProduct.cost}
            onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
          />
          <select
            value={newProduct.currency}
            onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <button onClick={handleProductCreation}>Create Product</button>
        </div>
      </div>

      {/* Task List */}
      <div className="task-list">
        <h2>Existing Tasks</h2>
        <ul>
          {tasks.map((task) => (
            <li
              key={task.id}
              className={selectedTask?.id === task.id ? "selected" : ""}
              onClick={() => {
                setSelectedTask(task);
                setShowSettings(false);
                setShowProducts(false);
                setShowSettingsRight(false);
                setShowProductsRight(false);
              }}
            >
              {task.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Diagram */}
      {selectedTask && (
        <div className="diagram">
          <div className="task-rectangle">
            <h2>{selectedTask.name}</h2>
            <div className="button-container">
              <button className="toggle-settings" onClick={toggleSettings}>⚙</button>
              <button className="toggle-d" onClick={toggleProducts}>D</button>
            </div>

            <div className="right-button-container">
              <button className="toggle-settings" onClick={toggleSettingsRight}>⚙</button>
              <button className="toggle-d" onClick={toggleProductsRight}>D</button>
            </div>

            <button className="time-button" onClick={() => setShowTimes((prev) => !prev)}>
              Start/End Time
            </button>


           {/* Input Settings Table */}
            {showSettings && (
              <div className="settings-table">
                <h3>Input Settings for {selectedTask.name}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Deployed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskDeployments[selectedTask.id]?.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td
                          className={product.input_deployed === "V" ? "deployed" : "not-deployed"}
                          onClick={() => toggleDeployment(product.id, "input")} // Toggle input deployment independently
                        >
                          {product.input_deployed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            


            {/* Output Settings Table */}
            {showSettingsRight && (
              <div className="output-settings-table">
                <h3>Output Settings for {selectedTask.name}</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Output Deployed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskDeployments[selectedTask.id]?.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td
                          className={product.output_deployed === "V" ? "deployed" : "not-deployed"}
                          onClick={() => toggleDeployment(product.id, "output")}
                        >
                          {product.output_deployed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

      
            {/* Input Ovals */}
            {showProducts && (
              <div className="product-oval-container">
                {taskDeployments[selectedTask.id]?.filter((product) => product.input_deployed === "V").length > 0 ? (
                  taskDeployments[selectedTask.id]
                    .filter((product) => product.input_deployed === "V")
                    .map((product) => (
                      <div key={product.id} className="product-oval">
                        <h3>{product.name}</h3>
                        <div className="product-oval-arrow"></div>
                      </div>
                    ))
                ) : (
                  <p className="no-products-message">No products deployed</p>
                )}
              </div>
            )}

              

            {/* Output Ovals */}
            {showProductsRight &&
              taskDeployments[selectedTask.id]?.filter(
                (product) => product.output_deployed === "V"
              ).map((product) => (
                <div key={product.id} className="output-product-oval">
                  <div>{product.name}</div>
                  <div className="output-product-oval-arrow"></div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Show Times */}
      {showTimes && (
        <div className="times">
          <p>Start Time: {selectedTask.start_time}</p>
          <p>End Time: {selectedTask.end_time}</p>
        </div>
      )}
    </div>
    
  )
}


export default App;