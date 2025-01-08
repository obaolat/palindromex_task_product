import React, { useState, useEffect } from "react";
import axios from "axios";
import "./style/style.css";
import CurrentTaskTable from "./components/CurrentTaskTable";
import CurrentProductTable from "./components/CurrentProductTable";
import CreationForms from "./components/CreationForms";
import MegaTaskWindow from "./components/MegaTaskWindow";


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
  const [showProducts, setShowProducts] = useState(true); 
  const [showSettingsRight, setShowSettingsRight] = useState(false); 
  const [showProductsRight, setShowProductsRight] = useState(true); 
  const [searchQueryOutput, setSearchQuery] = useState("");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState(""); // For settings table search
  const [inputSettings, setInputSettings] = useState([]); // Input settings for the selected task
  const [outputSettings, setOutputSettings] = useState([]); // Output settings for the selected task
  const [newTask, setNewTask] = useState({ name: "", start_time: "", end_time: "", cost: "", currency: "USD" });
  const [newProduct, setNewProduct] = useState({ name: "", creation_time: "", cost: "", currency: "USD" });
  const [deployedOutputProducts, setDeployedOutputProducts] = useState([]); // Separate state for deployed output products
  const [deployedInputProducts, setDeployedInputProducts] = useState([]); // Separate state for deployed input products
  const [isExpanded, setExpanded] = useState(false); // Manages whether the large rectangle is shown
  const [selectedOval, setSelectedOval] = useState(null);
  const [showCreateProduct, setShowCreateProduct] = useState(false); // Controls the create product modal
  const [showCreateOutputProduct, setShowCreateOutputProduct] = useState(false);
  const [relatedTasks, setRelatedTasks] = useState([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const [showTaskSettings, setShowTaskSettings] = useState(false); // To toggle visibility
  const [filteredTasks, setFilteredTasks] = useState([]); // Filtered list for display
  const [showTaskCreationForm, setShowTaskCreationForm] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null); // Tracks the product for task creation
  const [taskType, setTaskType] = useState(""); // Tracks whether it's input or output
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMegaTask, setShowMegaTask] = useState(false);
  const [showInputTasks, setShowInputTasks] = useState(true); // Default: show input tasks
  const [showOutputTasks, setShowOutputTasks] = useState(true); // Default: show output tasks
  const [settingsTableChanged, setSettingsTableChanged] = useState(false);
  const [attachedTasks, setAttachedTasks]= useState([]);

  const [taskProducts, setTaskProducts] = useState([]);







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

  useEffect(() => {
    if (selectedTask && showProducts) {
      console.log("Refreshing input products due to settings table change or toggle.");
      fetchAndUpdateInputProducts();
    }
  }, [settingsTableChanged, selectedTask, showProducts]);
  
  useEffect(() => {
    if (selectedTask && showProductsRight) {
      console.log("Refreshing output products due to settings table change or toggle.");
      fetchAndUpdateOutputProducts();
    }
  }, [settingsTableChanged, selectedTask, showProductsRight]);
  

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

const fetchTasksForProduct = async (productId, type) => {
  try {
    const response = await axiosInstance.get(`/api/products/${productId}/tasks`, {
      params: { type },
    });
    setRelatedTasks(response.data || []);
  } catch (error) {
    console.error("Error fetching tasks for product:", error);
  }
};

const handleTaskSearch = async (query) => {
  console.log("Search query entered:", query)
  setTaskSearchQuery(query);

  if (query.trim() === "") {
    setFilteredTasks([]); // Clear results if query is empty
    return;
  }

  // Filter tasks based on the search query
  const filtered = tasks.filter((task) => 
    task.name.toLowerCase().includes(query.toLowerCase())
  );
  setFilteredTasks(filtered);
};

const filteredAttachedTasks = relatedTasks.filter((task) =>
task.name.toLowerCase().includes(taskSearchQuery.toLowerCase())
);



const handleInputProductCreation = async () => {
  await addProductToTask("input");
  if (selectedTask) {
    console.log("Refreshing input products after creation...");
    fetchAndUpdateInputProducts(selectedTask.id);
  }
};

const handleOutputProductCreation = async () => {
   
  await addProductToTask("output");
  if (selectedTask) {
    console.log("Refreshing output products after creation...");
    fetchAndUpdateOutputProducts(selectedTask.id);
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

  
  const handleLeftSettingsClick = (product) => {
    setSelectedProduct(product);
    setTaskType("output"); // Left settings button handles output
    setShowTaskSettings(true);
  };

  const handleRightSettingsClick = (product) => {
    setSelectedProduct(product);
    setTaskType("input"); // Right settings button handles input
    setShowTaskSettings(true);
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
    console.log("Search query in MegaTaskWindow:", query);
    setSearchQuery(query);
  
    const filtered = products.filter((product) => {
      const isAlreadyAdded = outputSettings.some((p) => p.id === product.id);
      console.log("Filtering product:", product, "Already added:", isAlreadyAdded);
      return product.name.toLowerCase().includes(query.toLowerCase()) && !isAlreadyAdded;
    });
  
    setFilteredProducts(filtered);
  };
  

  const addToSettingsTable = (product) => {
    if (!selectedTask) {
      console.error("No task selected for adding the product");
      return;
    }
  
    if (inputSettings.some((p) => p.id === product.id)) {
      console.warn("Product is already added to this task.");
      return;
    }
  
    axiosInstance
      .patch(`/api/tasks/${selectedTask.id}/products`, {
        product_id: product.id,
        type: "input",
        action: "add",
      })
      .then(() => {
        // Add product to inputSettings
        const updatedInputSettings = [...inputSettings, { ...product, deployment_state: "V" }];
        setInputSettings(updatedInputSettings);
  
        // Update deployed input products dynamically
        const updatedDeployedInputProducts = updatedInputSettings.filter(
          (p) => p.deployment_state === "V"
        );
        setDeployedInputProducts(updatedDeployedInputProducts);
        setShowProducts(true);
        fetchAndUpdateInputProducts();

        setSettingsTableChanged((prev) => !prev);

        

        console.log(`Product ${product.name} added to input settings and ovals updated.`);
      })
      .catch((error) =>
        console.error("Error adding product to settings table:", error)
      );
  };
  

/*  const addToSettingsTableright = (product) => {
    if (!selectedTask) return;
  
    if (outputSettings.some((p) => p.id === product.id)) {
      console.warn("Product is already added to this task.");
      return;
    }
  
    axiosInstance
      .patch(`/api/tasks/${selectedTask.id}/products`, {
        product_id: product.id,
        type: "output",
        action: "add",
      })
      .then(() => {
        setOutputSettings((prev) => [...prev, { ...product, deployment_state: "V" }]);
      })
      .catch((error) => console.error("Error adding product to settings table:", error));
  };*/

  const addToSettingsTableright = (product) => {
    if (!selectedTask) {
      console.error("No task selected for adding the product");
      return;
    }
  
    if (outputSettings.some((p) => p.id === product.id)) {
      console.warn("Product is already added to this task.");
      return;
    }
  
    axiosInstance
      .patch(`/api/tasks/${selectedTask.id}/products`, {
        product_id: product.id,
        type: "output", // Correct type for the right settings
        action: "add",
      })
      .then(() => {
        // Add product to outputSettings
        const updatedOutputSettings = [...outputSettings, { ...product, deployment_state: "V" }];
        setOutputSettings(updatedOutputSettings);
  
        // Update deployed output products dynamically
        const updatedDeployedOutputProducts = updatedOutputSettings.filter(
          (p) => p.deployment_state === "V"
        );
        setDeployedOutputProducts(updatedOutputSettings.filter((p) => p.deployment_state === "V"));
  
        console.log(`Product ${product.name} added to output settings and ovals updated.`);
      })
      .catch((error) =>
        console.error("Error adding product to settings table (right):", error)
      );
  };
  const fetchAndUpdateInputProducts = async () => {
    try {
      const { deployed_input_products } = await fetchDeployedProducts(selectedTask.id);
      setDeployedInputProducts(deployed_input_products || []);
      console.log("Updated deployed input products:", deployed_input_products);
    } catch (error) {
      console.error("Error fetching input products:", error);
    }
  };
  
  const fetchAndUpdateOutputProducts = async () => {
    try {
      const { deployed_output_products } = await fetchDeployedProducts(selectedTask.id);
      const filteredDeployedOutputProducts = deployed_output_products.filter(
        (product) => product.deployment_state === "V"
      );
      setDeployedOutputProducts(filteredDeployedOutputProducts || []);
      console.log("Updated deployed output products:", filteredDeployedOutputProducts);
    } catch (error) {
      console.error("Error fetching output products:", error);
    }
  };
  
  
  
  
  const handleTaskCreation = async (taskData) => {
    if (!taskData.name || !taskData.start_time || !taskData.end_time) {
      console.error("Invalid task data:", taskData);
      return;
    }
  
    try {
      console.log("Creating task with validated data:", taskData);
      await axiosInstance.post("/api/tasks", taskData);
      fetchTasks();
      setNewTask({ name: "", start_time: "", end_time: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error("Error creating task:", error.response?.data || error.message);
    }
  };
  

  const handleProductCreation = async (productData) => {
    try {
      await axiosInstance.post("/api/products", productData);
      fetchProducts();
      if (selectedTask) fetchTaskDeployments(selectedTask.id); // Update deployments dynamically
      setNewProduct({ name: "", creation_time: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error("Error creating product:", error);
    }
  }; 

  const handleTaskCreationauto = async (e) => {
    e.preventDefault();
  
    console.log("Task creation initiated.");
  
    // Ensure selectedProduct and taskType are valid
    if (!selectedProduct || !taskType) {
      console.error("No product selected or task type is not set.");
      console.log("Selected Product:", selectedProduct);
      console.log("Task Type:", taskType);
      return;
    }
  
    try {
      // Create the task
      console.log("Sending request to create task with data:", newTask);
      const response = await axiosInstance.post("/api/tasks", newTask);
  
      // Extract task ID
      const createdTaskId = response.data?.task_id; // Correctly map to `task_id`
      console.log("Task creation response:", response.data);
  
      if (!createdTaskId) {
        console.error("Failed to create task. No task ID returned.");
        console.log("Response data:", response.data);
        return;
      }
  
      console.log(`Task successfully created with ID: ${createdTaskId}`);
  
      // Attach the product to the created task
      console.log(
        `Attaching product ${selectedProduct.id} as ${taskType} to task ${createdTaskId}`
      );
      try {
        const patchResponse = await axiosInstance.patch(`/api/tasks/${createdTaskId}/products`, {
          product_id: selectedProduct.id, // Product to attach
          type: taskType === "input" ? "output": "input",
          action: "add",
        });

        fetchTasksForProduct(selectedProduct.id,taskType);
  
        console.log("Product attachment response:", patchResponse.data);
      } catch (patchError) {
        console.error("Error attaching product to task:", patchError.message);
      }
  
      // Refresh task and product data
      console.log("Refreshing products and tasks...");
      fetchProducts();
      fetchTasksForProduct(selectedProduct.id, taskType);
  
      // Reset the task creation form
      console.log("Resetting task creation form.");
      setNewTask({ name: "", cost: "", currency: "USD" });
      setShowTaskCreationForm(false);
    } catch (error) {
      console.error("Error creating task or attaching product:", error.message);
      console.log("Full error details:", error);
    }
  };
  
  
const addTaskToProduct = async (task) => {
  if (!selectedOval || !taskType) {
    console.error("No product selected or taskType not set.");
    console.log("Selected Product:", selectedOval);
    console.log("Task Type:", taskType);
    return;
  }

  try {
    console.log(`Adding task ${task.id} to ${taskType} settings for product ${selectedOval.id}`);

    // Send the association to the backend
    await axiosInstance.patch(`/api/tasks/${task.id}/products`, {
      product_id: selectedOval.id,
      type: taskType === "input" ? "output" : "input",
      action: "add",
    });

    console.log(`Task ${task.id} successfully added to ${taskType} settings.`);
    setAttachedTasks((prev) => [...prev, task]);
    setSettingsTableChanged((prev) => !prev); // Trigger reactivity
    setRelatedTasks((prev) => [...prev, task]);

    if (taskType === "input") {
      setOutputSettings((prev) => [...prev, task]);
    } else if (taskType === "output") {
      setInputSettings((prev) => [...prev, task]);
    }
    fetchTasksForProduct(selectedOval.id, taskType);
  } catch (error) {
    console.error(`Error adding task ${task.id} to ${taskType} settings:`, error);
  }
};
  
  const addProductToTask = async (autoAddTo = null) => {
    try {
      // Create the product
      const response = await axiosInstance.post("/api/products", newProduct);
  
      // Check the full product object returned by the backend
      const createdProduct = response.data;
      console.log("Product creation response:", createdProduct);
  
      fetchProducts();
  
      // If a task is selected, fetch its deployments
      if (selectedTask) fetchTaskDeployments(selectedTask.id);
  
      // Auto-add to input or output if required
      if (autoAddTo && selectedTask) {
        if (!createdProduct?.product_id) {
          console.error(
            "Cannot auto-add to input/output. Ensure createdProduct is valid.",
            { selectedTask: { id: selectedTask.id, name: selectedTask.name }, createdProduct }
          );
          return;
        }
  
        console.log(
          `Adding product ${createdProduct.product_id} as ${autoAddTo} for task ${selectedTask.id}`
        );
  
        await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
          product_id: createdProduct.product_id,
          type: autoAddTo, // "input" or "output"
          action: "add",
        });
  
        // Refresh deployments dynamically
        fetchTaskDeployments(selectedTask.id);
      }
  
      // Reset the product form state
      setNewProduct({ name: "", creation_time: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error("Error creating product or adding to input/output:", error.message);
    }
  };
  

  // Function to toggle deployment status (V ↔ X)
  const toggleDeploymentStatus = async (productId, currentState) => {
  if (!selectedTask) return;

  try {
    const newState = currentState === "V" ? "X" : "V"; // Toggle state

    await axiosInstance.patch(`/api/tasks/${selectedTask.id}/products`, {
      product_id: productId,
      type: "input",
      state: newState, // Update state in the backend
    });

    // Update state locally for immediate feedback
    setInputSettings((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, deployment_state: newState } : product
      )
    );
    setDeployedInputProducts((prevProducts) => {
      if (newState === "V") {
        // If deployed, add the product to the ovals if it's not already there
        const deployedProduct = inputSettings.find((product) => product.id === productId);
        return deployedProduct ? [...prevProducts, deployedProduct] : prevProducts;
      } else {
        // If undeployed, remove the product from the ovals
        return prevProducts.filter((product) => product.id !== productId);
      }
    });

    console.log(`Product ${productId} deployment state updated to ${newState}`);

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

    fetchAndUpdateInputProducts(selectedTask.id);
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

    fetchAndUpdateOutputProducts(selectedTask.id);
  } catch (error) {
    console.error("Error deleting product from settings table:", error);
  }
};


  const toggleSettings = () => {
    setShowSettings((prev) => !prev);
  };
  const toggleSettingsRight = () => {
    setShowSettingsRight((prev) => !prev);
  };

  

  const toggleProducts = async () => {
  console.log("Selected Task in toggleProducts before check:", selectedTask);

  if (!selectedTask) {
    console.warn("No task selected for showing input products");
    return;
  }

  console.log("Selected Task for input products:", selectedTask);

  const shouldShow = !showProducts
  try {
    const { deployed_input_products } = await fetchDeployedProducts(selectedTask.id);
    console.log("Fetched Input Products:", deployed_input_products);

    if (shouldShow) {
      const { deployed_input_products } = await fetchDeployedProducts(selectedTask.id);
      console.log("Fetched Input Products:", deployed_input_products);

      setDeployedInputProducts(deployed_input_products || []);
    }

    setShowProducts((prev) => !prev);
  } catch (error) {
    console.error("Error toggling deployed products:", error);
  }
};
const deleteTaskFromProduct = async (taskId, productId) => {
  if (!taskId || !productId) {
    console.error("Task ID or Product ID is missing");
    return;
  }

  try {
    // Send request to delete the relationship
    await axiosInstance.delete(`/api/tasks/${taskId}/products/${productId}`);
    console.log(`Deleted task ${taskId} from product ${productId}`);

    // Update the state to remove the task locally
    setRelatedTasks((prev) => prev.filter((task) => task.id !== taskId));
    setAttachedTasks((prev) => {
      console.log("Previous state in setAttachedTasks:", prev);
      if (!Array.isArray(prev)) {
        console.error("AttachedTasks is not an array. Resetting to an empty array.");
        return [];
      }
      return prev.filter((task) => task.id !== taskId && task.name.toLowerCase().includes(taskSearchQuery.toLowerCase()));
    });
    

    // Refresh the attached tasks dynamically
    const updatedRelatedTasks = relatedTasks.filter((task) => task.id !== taskId);
    const updatedAttachedTasks = updatedRelatedTasks.filter((task) =>
      task.name.toLowerCase().includes(taskSearchQuery.toLowerCase())
    );

    setRelatedTasks(updatedRelatedTasks); // Update the base list
    setAttachedTasks(updatedAttachedTasks); // Update the filtered list in the UI

    // Fetch updated tasks for the product
    fetchTasksForProduct(productId, "input");
    fetchTasksForProduct(productId, "output");

    setRelatedTasks((prev) => prev.filter((task) => task.id !== taskId));

    // Optionally refresh products for the task
    fetchProductsForTask(taskId);
  } catch (error) {
    console.error("Error deleting task from product:", error.message);
  }
};

const fetchProductsForTask = async (taskId) => {
  try {
    const response = await axiosInstance.get(`/api/tasks/${taskId}/products`);
    console.log("Fetched products for task:", response.data);
    setTaskProducts(response.data || []); // Update the state for task's products
  } catch (error) {
    console.error("Error fetching products for task:", error.message);
  }
};


  
  const toggleProductsRight = async () => {
    if (!selectedTask) return;
  
    try {
      const { deployed_output_products } = await fetchDeployedProducts(selectedTask.id);
  
      const filteredDeployedOutputProducts = deployed_output_products.filter(
        (product) => product.deployment_state === "V"
      );
  
      setShowProductsRight((prev) => !prev);
  
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


      <CurrentTaskTable tasks={tasks}
      newTask={newTask}
      setNewTask={setNewTask} 

      handleTaskCreation={handleTaskCreation}
      />
      <CurrentProductTable 
      products={products} 

      handleProductCreation={handleProductCreation}
      />

      <CreationForms
              newTask={newTask}
              setNewTask={setNewTask}
              handleTaskCreation={handleTaskCreation}
              newProduct={newProduct}
              setNewProduct={setNewProduct}
              handleProductCreation={handleProductCreation}
              showTaskForm={showTaskForm}
              setShowTaskForm={setShowTaskForm}
              showProductForm={showProductForm}
              setShowProductForm={setShowProductForm}
              
            />
      <button
        className="create-mega-task-btn"
        onClick={() => setShowMegaTask(true)}
      >
        Create Mega Task
      </button>

      {/* Mega Task Window */}
      <MegaTaskWindow
        showMegaTask={showMegaTask}
        setShowMegaTask={setShowMegaTask}
        tasks={tasks}
        products={products}
        selectedTask={selectedTask}
        isExpanded={isExpanded}
        setExpanded={setExpanded}
        deployedInputProducts={deployedInputProducts}
        deployedOutputProducts={deployedOutputProducts}
        toggleProducts={toggleProducts}
        toggleProductsRight={toggleProductsRight}
        showProducts={showProducts}
        showProductsRight={showProductsRight}
        setSelectedOval={setSelectedOval}
        toggleSettings={toggleSettings} // Ensure this is passed
        toggleSettingsRight={toggleSettingsRight} // Ensure this is passed
        showSettings={showSettings} // Ensure this is passed
        showSettingsRight={showSettingsRight} // Ensure this is passed
        inputSettings={inputSettings}
        outputSettings={outputSettings}
        handleSettingsSearch={handleSettingsSearch}
        toggleDeploymentStatus={toggleDeploymentStatus}
        taskSearchQuery={taskSearchQuery}
        settingsSearchQuery={settingsSearchQuery}
        filteredProducts={filteredProducts}
        addToSettingsTable={addToSettingsTable}
        handleProductCreation = {handleProductCreation}
        searchQueryOutput={searchQueryOutput}
        addToSettingsTableright={addToSettingsTableright}
        setFilteredProducts ={setFilteredProducts}
        setSearchQuery = {setSearchQuery}
        selectedProduct = {selectedProduct}
        newProduct={newProduct}
        handleOutputSettingsSearch={handleOutputSettingsSearch}
        deleteFromSettingsTable={deleteFromSettingsTable}
        setSelectedTask={setSelectedTask}
        setShowCreateProduct={setShowCreateProduct}
        showCreateProduct={showCreateProduct}
        showCreateOutputProduct={showCreateOutputProduct}
        setNewProduct={setNewProduct}
        handleInputProductCreation={handleInputProductCreation}
        setShowCreateOutputProduct={setShowCreateOutputProduct}
        handleOutputProductCreation={handleOutputProductCreation}
        deleteFromOutputSettingsTable={deleteFromOutputSettingsTable}
        toggleOutputDeploymentStatus={toggleDeploymentStatus}
        selectedOval = {selectedOval} 
        setShowTaskSettings={setShowTaskSettings}  
        fetchTasksForProduct={fetchTasksForProduct} 
        setSelectedProduct={setSelectedProduct}  
        setTaskType={setTaskType}
        handleTaskCreationauto={handleTaskCreationauto}
        showTaskCreationForm={showTaskCreationForm}
        setShowTaskCreationForm={setShowTaskCreationForm}
        filteredAttachedTasks = {filteredAttachedTasks} 
        attachedTasks={attachedTasks}
        filteredTasks = {filteredTasks}
        handleTaskSearch={handleTaskSearch}
        setNewTask={setNewTask}
        fetchTasks = {fetchTasks}
        newTask={newTask}
        showTaskSettings={showTaskSettings}
        setTaskSearchQuery={setTaskSearchQuery}
        setFilteredTasks ={setFilteredTasks}
        addTaskToProduct={addTaskToProduct}
        taskType={taskType}
        settingsTableChanged = {settingsTableChanged}
        setSettingsTableChanged = {setSettingsTableChanged} 
        setTaskProducts = {setTaskProducts}
        deleteTaskFromProduct={deleteTaskFromProduct}
        setAttachedTasks={setAttachedTasks}
        setRelatedTasks = {setRelatedTasks}
        relatedTasks = {relatedTasks}


                
      />
      

        
      
    </div>
    
    
  )
}


export default App;