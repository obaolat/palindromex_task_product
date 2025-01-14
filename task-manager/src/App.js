import React, { useState, useEffect } from "react";
import axios from "axios";
import "./style/style.css";
import CurrentTaskTable from "./components/CurrentTaskTable";
import CurrentProductTable from "./components/CurrentProductTable";
import MegaTaskWindow from "./components/MegaTaskWindow";
import CreationForms from "./components/CreationForms"
import { motion, AnimatePresence } from "framer-motion";


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
  const [selectedProduct, setSelectedProduct] = useState([]); // Tracks the product for task creation
  const [taskType, setTaskType] = useState(""); // Tracks whether it's input or output
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showMegaTask, setShowMegaTask] = useState(false);
  const [showInputTasks, setShowInputTasks] = useState(true); // Default: show input tasks
  const [showOutputTasks, setShowOutputTasks] = useState(true); // Default: show output tasks
  const [settingsTableChanged, setSettingsTableChanged] = useState(false);
  const [attachedTasks, setAttachedTasks]= useState([]);
  const [contextInputSettings, setContextInputSettings] = useState({});
  const [contextOutputSettings, setContextOutputSettings] = useState({});
  const [showTask, setShowTask] = useState({})


  const [taskProducts, setTaskProducts] = useState([]);
  const [rectangles, setRectangles] = useState([]);





  useEffect(() => {
    fetchTasks();
    fetchProducts();
  }, []);
/*
  useEffect(() => {
    if (selectedTask) {
      fetchTaskDeployments(selectedTask.id);
  
    }
  }, [selectedTask]);
*/
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
  
  useEffect(() => {
    console.log("Rectangles updated:", rectangles);
  }, [rectangles]);


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

/*
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

*/
const fetchTasksForProduct = async (type) => {
  console.log(selectedOval, selectedOval.id, selectedOval.instance_id)
  if (!selectedOval || !selectedOval.id || !selectedOval.instance_id) {
    console.error("No product or instance selected for fetching tasks.");
   return ;
  }

  try {
    const response = await axiosInstance.get(
      `/api/products/${selectedOval.id}/instance/${selectedOval.instance_id}/tasks`,
      { params: { type } }
    );
    setRelatedTasks(response.data || []);
    console.log(`Tasks fetched successfully for product ${selectedProduct.id} (type: ${type}).`);
  } catch (error) {
    console.error("Error fetching tasks for selected product:", error);
  }
};

/*
const handleProductSelection = (productId) => {
  const product = products.find((p) => p.id === parseInt(productId));
  if (product) {
    setSelectedProduct(product);
    setSelectedTask(null); // Clear task selection
    console.log(`Product with ID ${productId} selected:`, product);
  }
};
*/

const handleProductSelection = async (productId) => {
  try{
    const product = products.find((p) => p.id ===parseInt(productId))
    if (!product) {
      console.warn ("Product not found with ID:", productId);
      return;
    }
    
    const response = await axiosInstance.post(`/api/products/${productId}/instance`);
    const { instance_id } = response.data;

    setSelectedProduct({id: productId, name: product.name, instanceId: instance_id, deployment_state: "V", side:"left"});
    console.log("Product selected:", { id: productId, instanceId: instance_id });
    setSelectedTask(null);
    console.log(`New instance creared for product ${productId}:`, instance_id);
  }catch(error) {
    console.error("Error creating context for task:", error.response?.data || error.message)
  }
};


const handleTaskSelection = async (taskId) => {
  try {
    // Find the task to extract its name
    const task = tasks.find((t) => t.id === parseInt(taskId));
    if (!task) {
      console.warn("Task not found with ID:", taskId);
      return;
    }


    // Make the API call
    const response = await axiosInstance.post(`/api/tasks/${taskId}/contexts`);
    const { context_id } = response.data;

    // Update the selected task with name and context
    setSelectedTask({ id: taskId, name: task.name, contextId: context_id });
    console.log("Task selected:", { id: taskId, contextId: context_id });
    setSelectedProduct(null); // Clear product selection

    console.log(`New context created for task ${taskId}:`, context_id);
  } catch (error) {
    console.error("Error creating context for task:", error.response?.data || error.message);
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
    //fetchAndUpdateOutputProducts(selectedTask.id);
  }
};

/*
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
*/
  
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

  const fetchChain = async (productId, depth = 3, direction = "forward") => {
    try {
      const response = await axiosInstance.get(
        `/api/relationships/${productId}?depth=${depth}&direction=${direction}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching chain data:", error.message);
    }
  };
    
  
  const handleSettingsSearch = (query) => {
    console.log("Search query in MegaTaskWindow:", query);

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
  
/*
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
       // fetchAndUpdateInputProducts();

        setSettingsTableChanged((prev) => !prev);

        

        console.log(`Product ${product.name} added to input settings and ovals updated.`);
      })
      .catch((error) =>
        console.error("Error adding product to settings table:", error)
      );
  };
*/  

const addToSettingsTable = async (product) => {
  if (!selectedTask) {
    console.error("No task selected for adding the product");
    return;
  }

  const { id: taskId, contextId } = selectedTask;

  if (!contextId) {
    console.error("No context available for this task.");
    return;
  }

  // Get the input settings for the current context
  const currentInputSettings = contextInputSettings[contextId] || [];

  if (currentInputSettings.some((p) => p.id === product.id)) {
    console.warn("Product is already added to this context.");
    return;
  }

  try {
    // Step 1: Create a new instance for the product
    const instanceResponse = await axiosInstance.post(`/api/products/${product.id}/instance`);
    const { instance_id } = instanceResponse.data;

    // Step 2: Add the product (with the instance_id) to the task
    await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, {
      product_id: product.id,
      instance_id: instance_id, // Pass the new instance ID
      type: "input",
      action: "add",
    });



    // Step 3: Update input settings for the specific context
    const updatedInputSettings = [
      ...currentInputSettings,
      { ...product, deployment_state: "V", instance_id: instance_id },
    ];
    setContextInputSettings((prev) => ({
      ...prev,
      [contextId]: updatedInputSettings,
    }));

    // Optionally update any derived states (like deployed products)
    const updatedDeployedInputProducts = updatedInputSettings.filter(
      (p) => p.deployment_state === "V"
    );
    setDeployedInputProducts(updatedDeployedInputProducts);

    console.log(
      `Product ${product.name} (instance: ${instance_id}) added to input settings for context ${contextId}.`
    );
  } catch (error) {
    console.error(
      "Error adding product to settings table:",
      error.response?.data || error.message
    );
  }
};



/*
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
  */

  const addToSettingsTableright = async (product) => {
    console.log("Current selectedTask:", selectedTask);
    if (!selectedTask) {
      console.error("No task selected for adding the product");
      return;
    }
  
    const { id: taskId, contextId } = selectedTask;
  
    if (!contextId) {
      console.error("No context available for this task.");
      return;
    }
  
    // Get the output settings for the current context
    const currentOutputSettings = contextOutputSettings[contextId] || [];
  
    if (currentOutputSettings.some((p) => p.id === product.id)) {
      console.warn("Product is already added to this context.");
      return;
    }

    try {
      const instanceResponse = await axiosInstance.post(`/api/products/${product.id}/instance`);
      const { instance_id } = instanceResponse.data;
  
    axiosInstance
      .patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, {
        product_id: product.id,
        instance_id: instance_id,
        type: "output",
        action: "add",
      });
        // Update output settings for the specific context
        const updatedOutputSettings = [
          ...currentOutputSettings, 
          { ...product, deployment_state: "V", instance_id:instance_id },
        ];
        setContextOutputSettings((prev) => ({
          ...prev,
          [contextId]: updatedOutputSettings,
        }));
  
        // Optionally update any derived states (like deployed products)
        const updatedDeployedOutputProducts = updatedOutputSettings.filter(
          (p) => p.deployment_state === "V"
        );
        setDeployedOutputProducts(updatedDeployedOutputProducts);
  
        console.log(`Product ${product.name} with ${instance_id}added to output settings for context ${contextId}.`);
      
    } catch(error) {
        console.error(
          "Error adding product to settings table (right):", 
          error.response?.data || error.message
      );
    }
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
     // if (selectedTask) fetchTaskDeployments(selectedTask.id); // Update deployments dynamically
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
        `Attaching product ${selectedProduct.id} with sel as ${taskType} to task ${createdTaskId}`
      );
      try {
        console.log(`Creating context for task ${createdTaskId} before adding it to product ${selectedProduct.id}`);
    
      
        const contextResponse = await axiosInstance.post(`/api/tasks/${createdTaskId}/contexts`);
        const { context_id } = contextResponse.data;

        console.log(`Adding task ${createdTaskId} (context: ${context_id}) to ${taskType} settings for product ${selectedProduct.id}`);
        console.log(selectedProduct.id)
        await axiosInstance.patch(`/api/tasks/${createdTaskId}/contexts/${context_id}/products`, {
          product_id: selectedProduct.id,
          type: taskType === "input" ? "output" : "input",
          action: "add",
        });

            console.log(`Task ${createdTaskId} successfully added to ${taskType} settings with context ${context_id}.`);


          setAttachedTasks((prev) => [...prev, { ...newTask, contextId: context_id }]);
          setSettingsTableChanged((prev) => !prev); // Trigger reactivity
          setRelatedTasks((prev) => [...prev, { ...newTask, contextId: context_id }]);

          const contextsResponse = await axiosInstance.get(`/api/products/${selectedProduct.id}/contexts`);
          const allContexts = contextsResponse.data.map((ctx) => ctx.context_id);
      
          console.log("All related contexts:", allContexts);
      
          // Iterate through all contexts and fetch tasks
          for (const context of allContexts) {
            await fetchTasksForProduct(selectedProduct.id, context, taskType);
          }
         
 
  
      } catch (patchError) {
        console.error("Error attaching product to task:", patchError.message);
      }
  
      // Refresh task and product data
      console.log("Refreshing products and tasks...");
      fetchProducts();
  
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
    console.log("Selected Product in addTaskToProduct:", selectedProduct);

    console.log(selectedProduct)
    if (!selectedOval || !taskType) {
      console.error("No product selected or taskType not set.");
      console.log("Selected Product:", selectedOval);
      console.log("Task Type:", taskType);
      return;
    }
    
    try {
      console.log(`Creating context for task ${task.id} before adding it to product ${selectedProduct.id}`);
      
      // Step 1: Trigger context_id creation for the task
      const contextResponse = await axiosInstance.post(`/api/tasks/${task.id}/contexts`);
      const { context_id } = contextResponse.data;
  
      console.log(`Context created for task ${task.id}: ${context_id}`);
  
      // Step 2: Send the association to the backend
      console.log(`Adding task ${task.id} (context: ${context_id}) to ${taskType} settings for product ${setSelectedProduct.id}`);
      console.log(selectedProduct.id)
      await axiosInstance.patch(`/api/tasks/${task.id}/contexts/${context_id}/products`, {
        product_id: selectedProduct.id,
        instance_id: selectedProduct.instanceId,
        type: taskType === "input" ? "output" : "input",
        action: "add",
      });
  
      console.log(`Task ${task.id} successfully added to ${taskType} settings with context ${context_id}.`);
  
      // Step 3: Update frontend state
      setAttachedTasks((prev) => [...prev, { ...task, contextId: context_id }]);
      setSettingsTableChanged((prev) => !prev); // Trigger reactivity
      setRelatedTasks((prev) => [...prev, { ...task, contextId: context_id }]);
      console.log(task, context_id)


  
      if (taskType === "input") {
        setOutputSettings((prev) => [...prev, { ...task, contextId: context_id }]);
      } else if (taskType === "output") {
        setInputSettings((prev) => [...prev, { ...task, contextId: context_id }]);
      }
  
     fetchTasksForProduct(taskType, selectedProduct.id, selectedProduct.instanceId, );
    
     console.log("Updated Related Tasks:", relatedTasks);


  
      // Step 4: Fetch updated task settings for the product
    } catch (error) {
      console.error(`Error adding task ${task.id} to ${taskType} settings:`, error.response?.data || error.message);
    }
  };
  

/*  
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


    console.log("This is the rectangle",rectangles)
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
 /* 
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
  */

  const addProductToTask = async (autoAddTo = null) => {
    if (!selectedTask) {
      console.error("No task selected. Cannot proceed.");
      return;
    }
  
    const { id: taskId, contextId } = selectedTask;
  
    if (!contextId) {
      console.error("No context available for the selected task.");
      return;
    }
  
    try {
      console.log("Initiating product creation with:", newProduct);
  
      // Step 1: Create the product
      const response = await axiosInstance.post("/api/products", newProduct);
      const { product_id, message } = response.data;
  
      console.log("Product creation response:", response.data);
  
      if (!product_id) {
        console.error("Product creation failed. Backend response is invalid.");
        return;
      }
  
      console.log(`Product ${product_id} created successfully.`);
      const instanceResponse = await axiosInstance.post(`/api/products/${product_id}/instance`);
      const { instance_id } = instanceResponse.data;
  
      // Step 2: Prepare the full product object
      const createdProduct = {
        ...newProduct, // Use local product details
        id: product_id, // Use backend ID
        deployment_state: "V", // Default deployment state
        instance_id: instance_id
      };
  
      // Step 3: Update context settings dynamically
      if (autoAddTo) {
        console.log(`Adding product ${product_id} as ${autoAddTo} to task ${taskId}.`);



  
        await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, {
          product_id,
          instance_id:instance_id,
          type: autoAddTo, // "input" or "output"
          action: "add",
        });
  
        console.log(`Product ${product_id} with ${instance_id} successfully added as ${autoAddTo}.`);
        
  
        // Update the context-specific settings
        const updateSettings = autoAddTo === "input" ? setContextInputSettings : setContextOutputSettings;
        updateSettings((prev) => {
          const currentSettings = prev[contextId] || [];
          return {
            ...prev,
            [contextId]: [...currentSettings, createdProduct],
          };
        });
  
        console.log(
          `Updated ${autoAddTo} settings for context ${contextId}:`,
          autoAddTo === "input" ? contextInputSettings : contextOutputSettings
        );
      }
  
      // Step 4: Reset the product form state
      setNewProduct({ name: "", creation_time: "", cost: "", currency: "USD" });
      console.log("Product form state reset.");
    } catch (error) {
      console.error(
        "Error during product creation or adding to input/output:",
        error.response?.data || error.message
      );
    }
  };
  
  
  
  

  // Function to toggle deployment status (V ↔ X)
  const toggleDeploymentStatus = async (productId, currentState) => {
  if (!selectedTask){
  console.error("No task selected")
  return;
  }

  const {id: taskId, contextId} = selectedTask;

  if (!contextId) {
    console.error("No context available for this task.")
    return;
  }

  const productWithInstance = (contextInputSettings[contextId] || []).find(
    (p) => p.id === productId
  );

  if (!productWithInstance) {
    console.error("Product not found in the output settings.");
    return;
  }

  const { instance_id } = productWithInstance

  try {
    const newState = currentState === "V" ? "X" : "V"; // Toggle state
      const payload ={
      product_id: productId,
      instance_id:instance_id,
      type: "input",
      action: "update_state",
      state: newState, // Update state in the backend
      };
      await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, payload);

      setContextInputSettings((prev) => {
        const updatedContextInputSettings = (prev[contextId] || []).map((product) =>
          product.id === productId ? { ...product, deployment_state: newState } : product
        );
  
        return {
          ...prev,
          [contextId]: updatedContextInputSettings,
        };
    });

    // Update state locally for immediate feedback
    
    setDeployedInputProducts((prev) =>
    (contextInputSettings[contextId] || []).filter((p) => p.deployment_state === "V")
  );

   console.log(`Deployment status toggled for product ${productId} in context ${contextId}.`);
  } catch (error) {
    console.error(
      "Error toggling deployment status:",
      error.response?.data || error.message
    );
  }
};


const toggleOutputDeploymentStatus = async (productId, currentState) => {
  if (!selectedTask) {
    console.error("No task selected.");
    return;
  }

  const { id: taskId, contextId } = selectedTask;

  if (!contextId) {
    console.error("No context available for this task.");
    return;
  }
  const productWithInstance = (contextOutputSettings[contextId] || []).find(
    (p) => p.id === productId
  );

  if (!productWithInstance) {
    console.error("Product not found in the output settings.");
    return;
  }

  const { instance_id } = productWithInstance
  try {
    const newState = currentState === "V" ? "X" : "V"; // Toggle state

    // Ensure all required fields are included in the request payload
    const payload = {
      product_id: productId,
      instance_id: instance_id,
      type: "output",
      action: "update_state", // Optional: confirm with backend if this is needed
      state: newState,
    };

    await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, payload);

    // Update state locally for the specific context
    setContextOutputSettings((prev) => {
      const updatedContextOutputSettings = (prev[contextId] || []).map((product) =>
        product.id === productId ? { ...product, deployment_state: newState } : product
      );

      return {
        ...prev,
        [contextId]: updatedContextOutputSettings,
      };
    });

    // Optionally update deployed products for the context
    setDeployedOutputProducts((prev) =>
      (contextOutputSettings[contextId] || []).filter((p) => p.deployment_state === "V")
    );

    console.log(`Deployment status toggled for product ${productId} in context ${contextId}.`);
  } catch (error) {
    console.error(
      "Error toggling deployment status:",
      error.response?.data || error.message
    );
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
 
  if (!selectedTask) {
    console.error("No task selected for deleting the product.");
    return;
  }

  const { id: taskId, contextId } = selectedTask;

  if (!contextId) {
    console.error("No context available for this task.");
    return;
  }

  const productWithInstance = (contextInputSettings[contextId] || []).find(
    (p) => p.id === productId
  );

  if (!productWithInstance) {
    console.error("Product not found in the intput settings.");
    return;
  }

  const { instance_id } = productWithInstance

  try {
    // Make a POST request to the backend to delete the product
    await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, {
      product_id: productId,
      instance_id: instance_id, // Pass the instance ID for this product
      type: "input",
      action: "delete",
    });

    // Update context-specific input settings locally
    setContextInputSettings((prev) => {
      const updatedSettings = (prev[contextId] || []).filter(
        (product) => product.id !== productId
      );
      return { ...prev, [contextId]: updatedSettings };
    });

    console.log(`Product ${productId} deleted from input settings for context ${contextId}.`);
  } catch (error) {
    console.error("Error deleting product from input settings table:", error.response?.data || error.message);
  }
};


const deleteFromOutputSettingsTable = async (productId) => {
  if (!selectedTask) return;


  const { id: taskId, contextId } = selectedTask;

  if (!contextId) {
    console.error("No context available for this task.");
    return;
  }
  
  const productWithInstance = (contextOutputSettings[contextId] || []).find(
    (p) => p.id === productId
  );

  if (!productWithInstance) {
    console.error("Product not found in the output settings.");
    return;
  }

  const { instance_id } = productWithInstance

  try {
    await axiosInstance.patch(`/api/tasks/${taskId}/contexts/${contextId}/products`, {
      product_id: productId,
      instance_id: instance_id,
      context_id:contextId,
      type: "output",  // Ensure this matches your backend validation
      action: "delete",  // Indicates a delete operation
    });

    // Update state locally
    setContextOutputSettings((prev) => {
      const updatedSettings = (prev[contextId] || []).filter(
        (product) => product.id !== productId
      );
      return { ...prev, [contextId]: updatedSettings };
    });

    console.log(`Product ${productId} deleted from output settings for context ${contextId}.`);
  } catch (error) {
    console.error("Error deleting product from output settings table:", error.response?.data || error.message);
  }
};




  const toggleSettings = () => {
    setShowSettings((prev) => !prev);
  };
  const toggleSettingsRight = () => {
    setShowSettingsRight((prev) => !prev);
  };

/*  

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
*/
const deleteTaskFromProduct = async (taskId, productId) => {
  if (!taskId || !productId) {
    console.error("Task ID or Product ID is missing");
    return;
  }

  try {
    // Send request to delete the relationship
    await axiosInstance.delete(`/api/tasks/${taskId}/products/${productId}`);
    console.log(`Deleted task ${taskId} from product ${productId}`);
    setRectangles((prev) => prev.filter((rect) => rect.id !== taskId));
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
    fetchTasksForProduct( "input", productId,);
    fetchTasksForProduct("output", productId, );

    setRelatedTasks((prev) => prev.filter((task) => task.id !== taskId));

   
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

const toggleProducts = async () => {
  console.log("Selected Task in toggleProducts before check:", selectedTask);

  if (!selectedTask) {
    console.warn("No task selected for toggling output products");
    return;
  }

  const shouldShow = !showProducts; // Determine the toggle state
  console.log("Toggling output products. Current state:", shouldShow);

  try {
    // Get the output products for the selected task
    const taskInputProducts = contextInputSettings[selectedTask.contextId] || [];

    console.log("Output products for task:", taskInputProducts);

    if (shouldShow) {
      // When toggling on, set all products as selected
      setSelectedProduct(taskInputProducts); // Assume selectedProduct holds an array
      console.log("Selected output products set:", taskInputProducts);
    } else {
      // When toggling off, clear the selected products
      setSelectedProduct([]);
      console.log("Selected output products cleared.");
    }

    // Update the visibility toggle
    setShowProducts(shouldShow);
  } catch (error) {
    console.error("Error toggling output products:", error);
  }
};



const toggleProductsright = async () => {
  console.log("Selected Task in toggleProducts before check:", selectedTask);

  if (!selectedTask) {
    console.warn("No task selected for toggling output products");
    return;
  }

  const shouldShow = !showProducts; // Determine the toggle state
  console.log("Toggling output products. Current state:", shouldShow);

  try {
    const taskOutputProducts = contextOutputSettings[selectedTask.contextId] || [];
    console.log("Output products for task:", taskOutputProducts);

    const filteredProducts = taskOutputProducts
    .filter((product) => product.deployment_state === "V")
    .map((product)=> ({...product, side:"right"}));

    if (shouldShow) {
      // Set the output products as selected
      setSelectedProduct(shouldShow ? filteredProducts : []);
      setShowProducts(shouldShow)
      console.log("Selected output products set:", taskOutputProducts);
    } else {
      // Clear the selected products when toggling off
      setSelectedProduct([]);
      console.log("Selected output products cleared.");
    }

    // Update the visibility toggle
    setShowProducts(shouldShow);
  } catch (error) {
    console.error("Error toggling output products:", error);
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
        toggleOutputDeploymentStatus={toggleOutputDeploymentStatus}
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
        fetchChain={fetchChain}
        setRectangles={setRectangles}
        rectangles = {rectangles}
        handleTaskSelection={handleTaskSelection}
        contextOutputSettings={contextOutputSettings}
        contextInputSettings={contextInputSettings}
        addProductToTask = {addProductToTask}
        handleProductSelection={handleProductSelection}  
        toggleProductsRight={toggleProductsright}  
        toggleProducts={toggleProducts}          
      />     
      
    </div>
    
    
  )
}


export default App;