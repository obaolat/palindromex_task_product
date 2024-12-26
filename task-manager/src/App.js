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
  const [searchQueryOutput, setSearchQuery] = useState("");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState(""); // For settings table search
  const [inputSettings, setInputSettings] = useState([]); // Input settings for the selected task
  const [outputSettings, setOutputSettings] = useState([]); // Output settings for the selected task
  const [newTask, setNewTask] = useState({ name: "", start_time: "", end_time: "", cost: "", currency: "USD" });
  const [newProduct, setNewProduct] = useState({ name: "", creation_time: "", cost: "", currency: "USD" });
  const [deployedOutputProducts, setDeployedOutputProducts] = useState([]); // Separate state for deployed output products
  const [deployedInputProducts, setDeployedInputProducts] = useState([]); // Separate state for deployed input products


  useEffect(() => {
    fetchTasks();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchTaskDeployments(selectedTask.id);
      fetchOutputProducts(selectedTask.id);
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
      setFilteredProducts(response.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchOutputProducts = async (taskId) => {
    try {
        const response = await axiosInstance.get(`/api/tasks/${taskId}/products`);
        setOutputSettings(response.data.output_products || []); // Store output products
    } catch (error) {
        console.error("Error fetching output products:", error);
    }
};


  

  const fetchTaskDeployments = async (taskId) => {
    try {
        const response = await axiosInstance.get(`/api/tasks/${taskId}/products`);
        
        // Update both input and output products in the task-specific state
        setTaskDeployments((prev) => ({
            ...prev,
            [taskId]: {
                input_products: response.data.input_products || [],
                output_products: response.data.output_products || [],
            },
        }));

        // Update input and output settings independently
        setInputSettings(response.data.input_products || []);
        setOutputSettings(response.data.output_products || []);
    } catch (error) {
        console.error("Error fetching task deployments:", error);
    }
};

  

  
  
  const handleSettingsSearch = (query) => {
    setSettingsSearchQuery(query);
  
    // Filter products not already attached to the selected task
    const filtered = products.filter((product) => {
      const isAlreadyAdded = inputSettings.some((p) => p.id === product.id); // Check if attached to the task
      return product.name.toLowerCase().includes(query.toLowerCase()) && !isAlreadyAdded;
    });
  
    setFilteredProducts(filtered);
  };
  
  
  const handleOutputSettingsSearch = (query) => {
    setSearchQuery(query);
    const filtered = products.filter((product) => {
      const isAlreadyAdded = outputSettings.some((p) => p.id === product.id);
      return product.name.toLowerCase().includes(query.toLowerCase()) && !isAlreadyAdded;
    });

    setFilteredProducts(filtered)
  }
  

  const addToSettingsTable = (product) => {
    if (!selectedTask) return;

    // Check if the product is already added to input settings
    if (inputSettings.some((p) => p.id === product.id)) {
        console.warn("Product is already added to this task as input.");
        return;
    }

    axiosInstance
        .patch(`/api/tasks/${selectedTask.id}/products`, {
            product_id: product.id,
            type: "input",
            action: "add",
        })
        .then(() => {
            // Verify if the backend confirms the addition
            const updatedProduct = { ...product, deployment_state: "V" };
            setInputSettings((prev) => [...prev, updatedProduct]);
        })
        .catch((error) => console.error("Error adding product to input settings table:", error));
};


const addToSettingsTableright = (product) => {
  if (!selectedTask) return;

  // Check if the product is already added to output settings
  if (outputSettings.some((p) => p.id === product.id)) {
      console.warn("Product is already added to this task as output.");
      return;
  }

  axiosInstance
      .patch(`/api/tasks/${selectedTask.id}/products`, {
          product_id: product.id,
          type: "output",
          action: "add",
      })
      .then((response) => {
          // Verify if the backend confirms the addition
          const updatedProduct = { ...product, deployment_state: "V" };
          setOutputSettings((prev) => [...prev, updatedProduct]);
      })
      .catch((error) => console.error("Error adding product to output settings table:", error));
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

  // Function to toggle deployment status (V ↔ X)
  const toggleDeploymentStatus = async (productId, currentState) => {
  if (!selectedTask) return;

  try {
    const newState = currentState === "V" ? "X" : "V"; // Toggle state

    await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
      product_id: productId,
      state: newState, // Update state in the backend
    });

    // Update state locally for immediate feedback
    setInputSettings((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, deployment_state: newState } : product
      )
    );
  } catch (error) {
    console.error("Error toggling deployment status:", error);
  }
};


const toggleOutputDeploymentStatus = async (productId, currentState) => {
  if (!selectedTask) return;

  try {
      const newState = currentState === "V" ? "X" : "V"; // Toggle state

      await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
          product_id: productId,
          type:"output",
          state: newState, // Update state in the backend
      });

      // Update state locally for immediate feedback
      setOutputSettings((prev) =>
          prev.map((product) =>
              product.id === productId ? { ...product, deployment_state: newState } : product
          )
      );
  } catch (error) {
      console.error("Error toggling deployment status:", error);
  }
};

  
  
  const addInputTable = (product) => {
    // Add the product to the input settings table locally
    setInputSettings((prev) => [...prev, product]);
  
    // Persist the addition in the backend
    axiosInstance
      .patch(`/api/tasks/${selectedTask.id}/products`, {
        product_id: product.id,
        type: "input",
        state: "V", // Default state is "V"
      })
      .catch((error) => {
        console.error("Error adding product to input table:", error);
      });
  };
  

  const fetchDeployedProducts = async (taskId) => {
    try {
        const response = await axiosInstance.get(`/api/tasks/${taskId}/deployed-products`);
        return response.data || [];
    } catch (error) {
        console.error("Error fetching deployed products:", error);
        return [];
    }
};

  
  
// Function to delete a product from input settings table
const deleteFromSettingsTable = async (productId) => {
  if (!selectedTask) return;

  try {
    await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
      product_id: productId,
      type: "input",
      action: "delete",
    });

    // Update the input settings table locally
    setInputSettings((prev) => prev.filter((product) => product.id !== productId));
  } catch (error) {
    console.error("Error deleting product from settings table:", error);
  }
};

const deleteFromOutputSettingsTable = async (productId) => {
  if (!selectedTask) return;

  try {
    await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
      product_id: productId,
      type: "output",
      action: "delete",
    });

    // Update the input settings table locally
    setOutputSettings((prev) => prev.filter((product) => product.id !== productId));
  } catch (error) {
    console.error("Error deleting product from settings table:", error);
  }
};


  const toggleSettings = () => {
    setShowSettings((prev) => {
      if (!prev) setShowProducts(false); // Ensure ovals are hidden when settings are shown
      return !prev;
    });
  };
  const toggleSettingsRight = () => {
    setShowSettingsRight((prev) => {
      if (!prev) setShowProductsRight(false); // Ensure ovals are hidden when settings are shown
      return !prev;
    });
  };

  

  const toggleProducts = async () => {
    if (!selectedTask) return;
  
    try {
      const { deployed_input_products } = await fetchDeployedProducts(selectedTask.id);
  
      setShowProducts((prev) => {
        if (!prev) setShowSettings(false); // Close settings when ovals are shown
        return !prev;
      });
      setDeployedInputProducts(deployed_input_products || []); // Set only "V" products for ovals
    } catch (error) {
      console.error("Error toggling deployed products:", error);
    }
  };
  
  const toggleProductsRight = async () => {
    if (!selectedTask) return;
  
    try {
      const { deployed_output_products } = await fetchDeployedProducts(selectedTask.id);
  
      const filteredDeployedOutputProducts = deployed_output_products.filter(
        (product) => product.deployment_state === "V"
      );
  
      setShowProductsRight((prev) => {
        if (!prev) setShowSettingsRight(false); // Close settings when showing ovals
        return !prev;
      });
  
      setDeployedOutputProducts(filteredDeployedOutputProducts || []); // Set only "V" products for ovals
    } catch (error) {
      console.error("Error toggling deployed output products:", error);
    }
  };
  



  const removeFromInputTable = async (productId) => {
    if (!selectedTask) return;
  
    try {
      await axiosInstance.delete(`/api/tasks/${selectedTask.id}/products`, {
        data: {
          product_id: productId,
          type: "input", // Specify the type of deployment to remove
        },
      });
  
      // Update the state to remove the product
      setInputSettings((prev) => prev.filter((product) => product.id !== productId));
    } catch (error) {
      console.error("Error removing product from input table:", error);
    }
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

            {/* Input Settings Table */}
      {showSettings && (
        <div className="settings-table">
          <h3>Input Settings for {selectedTask?.name || "Task"}</h3>

          {/* Input Product Title with Search Bar */}
          <div className="product-search-container">
            <label>Input Product:</label>
            <input
              type="text"
              placeholder="Search products..."
              value={settingsSearchQuery}
              onChange={(e) => handleSettingsSearch(e.target.value)}
              className="search-bar"
            />
          </div>

          {/* Dynamic Search Suggestions */}
          {settingsSearchQuery && (
            <div className="search-suggestions">
              {filteredProducts.map((product) => (
                <div key={product.id} className="search-item">
                  <span>{product.name}</span>
                  <button
                    className={`add-button ${inputSettings.some((p) => p.id === product.id) ? "disabled" : "enabled"}`}
                    disabled={inputSettings.some((p) => p.id === product.id)} // Disable if already added
                    onClick={() => addToSettingsTable(product)}
                  >
                    {inputSettings.some((p) => p.id === product.id) ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}



          {/* Input Products Table */}
            <table>
              <thead>
                <tr>
                  <th>Input Product</th>
                  <th>Deployment</th>
                </tr>
              </thead>
              <tbody>
                {inputSettings.length > 0 ? (
                  inputSettings.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.name}
                        <button
                          className="delete-button"
                          onClick={() => deleteFromSettingsTable(product.id)}
                        >
                          X
                        </button>
                      </td>
                      <td>
                        <button
                          className={`deployment-button ${
                            product.deployment_state === "V" ? "deployed" : "not-deployed"
                          }`}
                          onClick={() =>
                            toggleDeploymentStatus(product.id, product.deployment_state)
                          }
                        >
                          {product.deployment_state}

                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">No products added to input table</td>
                  </tr>
                )}
              </tbody>
            </table>

        </div>
      )}           
            {/* Input Ovals */}
            {showProducts && (
              <div className="product-oval-container">
                {deployedInputProducts.length > 0 ? (
                  deployedInputProducts.map((product) => (
                    <div key={product.id} className="product-oval">
                      <h3>{product.name}</h3>
                      <div className="product-oval-arrow"></div>
                    </div>
                  ))
                ) : (
                  <p className="no-products-message">No deployed products</p>
                )}
              </div>
            )}



      {/*Output SettingsTable*/}    
      {showSettingsRight && (
        <div className="output-settings-table">
          <h3>Output Settings for {selectedTask?.name || "Task"}</h3>

          {/* Output Product Title with Search Bar */}
          <div className="product-search-container">
            <label>Output Product:</label>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQueryOutput}
              onChange={(e) => handleOutputSettingsSearch(e.target.value)}
              className="search-bar"
            />
          </div> 


        {/* Dynamic Search Suggestions */}
        {searchQueryOutput && (
            <div className="search-suggestions">
              {filteredProducts.map((product) => (
                <div key={product.id} className="search-item">
                  <span>{product.name}</span>
                  <button
                    className={`add-button ${outputSettings.some((p) => p.id === product.id) ? "disabled" : "enabled"}`}
                    disabled={outputSettings.some((p) => p.id === product.id)} // Disable if already added
                    onClick={() => addToSettingsTableright(product)}
                  >
                    {outputSettings.some((p) => p.id === product.id) ? "Added" : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

            {/* Output Products Table */}
                <table>
                  <thead>
                    <tr>
                      <th>Output Product</th>
                      <th>Deployment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputSettings.length > 0 ? (
                      outputSettings.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}
                          <button
                          className="delete-button"
                          onClick={() => deleteFromOutputSettingsTable(product.id)}
                        >
                          X
                        </button>
                          </td>
                          <td>
                            <button
                              className={`deployment-button ${
                                product.deployment_state === "V" ? "deployed" : "not-deployed"
                              }`}
                              onClick={() =>
                                toggleOutputDeploymentStatus(product.id, product.deployment_state)
                              }
                            >
                              {product.deployment_state}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2">No products added to output table</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

      
      )}
              
            {/* Output Ovals */}
            
            {showProductsRight && (
              <div className="output-product-oval-container">
                {deployedOutputProducts.length > 0 ? (
                  deployedOutputProducts.map((product) => (
                    <div key={product.id} className="output-product-oval">
                      <h3>{product.name}</h3>
                      <div className="product-oval-arrow"></div>
                    </div>
                  ))
                ) : (
                  <p className="no-products-message">No deployed products</p>
                )}
              </div>
            )}


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