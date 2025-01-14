from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate 
import os
import uuid

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:yourpassword@localhost:5432/task_manager'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    level = db.Column(db.Integer, default=1)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    currency = db.Column(db.String(10), default="USD")

    # Relationship to TaskProduct junction table
    task_products = db.relationship('TaskProduct', back_populates='task')
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "cost" : self.cost,
            "currency": self.currency,
            
        }


class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)    
    name = db.Column(db.String(255), nullable=False)
    creation_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    currency = db.Column(db.String(10), default="USD")

    # Relationship to TaskProduct junction table
    task_products = db.relationship('TaskProduct', back_populates='product')


class TaskProduct(db.Model):
    __tablename__ = 'task_products'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    deployment_state = db.Column(db.String(1), default="V")  # V or X
    type = db.Column(db.String(10), nullable=False)
    context_id = db.Column (db.String(255), nullable=False)
    instance_id = db.Column (db.String(255), nullable=False)

    # Relationships
    task = db.relationship('Task', back_populates='task_products')
    product = db.relationship('Product', back_populates='task_products')


# Routes
@app.route('/api/tasks', methods=['GET', 'POST'])
def manage_tasks():
    if request.method == 'GET':
        tasks = Task.query.all()
        return jsonify([
            {
                "id": task.id,
                "name": task.name,
                "level": task.level,
                "start_time": task.start_time,
                "end_time": task.end_time,
                "cost": str(task.cost),
                "currency": str(task.currency),
            }
            for task in tasks
        ])
    elif request.method == 'POST':
        data = request.json

        # Validate required fields
        if not data.get('name'):
            return jsonify({"error": "Task name is required"}), 400
        if not data.get('start_time') or not data.get('end_time'):
            return jsonify({"error": "Start and end times are required"}), 400
        if not data.get('cost'):
            return jsonify({"error": "Task cost is required"}), 400

        # Create the new task
        new_task = Task(
            name=data['name'],
            level=data.get('level', 1),
            start_time=data['start_time'],
            end_time=data['end_time'],
            cost=data['cost'],
            currency=data.get('currency', 'USD')
        )
        db.session.add(new_task)
        db.session.commit()

        
        db.session.commit()

        return jsonify({"message": "Task created", "task_id": new_task.id}), 201


@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'GET':
        products = Product.query.all()
        return jsonify([
            {
                "id": product.id,
                "name": product.name,
                "creation_time": product.creation_time,
                "cost": str(product.cost),
                "currency": product.currency,
            }
            for product in products
        ])
    elif request.method == 'POST':
        data = request.json

        # Create the new product without automatic associations
        new_product = Product(
            name=data['name'],
            creation_time=data.get('creation_time'),
            cost=data['cost'],
            currency=data.get('currency', 'USD')
        )
        print("Request received:", request.method, request.json)
    
        db.session.add(new_product)
        db.session.commit()

        return jsonify({"message": "Product created", "product_id": new_product.id}), 201
            
        return jsonify(success=True)
    
"""  
@app.route('/api/tasks/<int:task_id>/products', methods=['GET'])
def get_task_products(task_id):
    #Fetch input and output products for a specific task.
    task_products = TaskProduct.query.filter_by(task_id=task_id).all()

    input_products = [
        {
            "id": tp.product.id,
            "name": tp.product.name,
            "deployment_state": tp.deployment_state,
        }
        for tp in task_products if tp.type == "input"
    ]

    output_products = [
        {
            "id": tp.product.id,
            "name": tp.product.name,
            "deployment_state": tp.deployment_state,
        }
        for tp in task_products if tp.type == "output"
    ]

    return jsonify({
        "input_products": input_products,
        "output_products": output_products,
    })
    
    """
@app.route('/api/tasks/<int:task_id>/contexts/<string:context_id>/products', methods=['GET'])
def get_task_products_context(task_id, context_id):
    """Retrieve input and output products for a specific task and context."""
    # Validate task
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Query task products filtered by context_id
    task_products = TaskProduct.query.filter_by(task_id=task_id, context_id=context_id).all()

    # Separate input and output products
    output_products = [
        {
            "id": tp.product_id,
            "name": tp.product.name,
            "deployment_state": tp.deployment_state,
        }
        for tp in task_products
        if tp.type == "output"
    ]

    input_products = [
        {
            "id": tp.product_id,
            "name": tp.product.name,
            "deployment_state": tp.deployment_state,
        }
        for tp in task_products
        if tp.type == "input"
    ]

    return jsonify({"output_products": output_products, "input_products": input_products})

"""    
@app.route('/api/products/<int:product_id>/tasks', methods=['GET'])
def get_tasks_for_product(product_id):
    type = request.args.get('type')  # 'input' or 'output'
    if type == 'input':
        tasks = Task.query.join(TaskProduct).filter(
            TaskProduct.product_id == product_id,
            TaskProduct.type == 'output'
        ).all()
    elif type == 'output':
        tasks = Task.query.join(TaskProduct).filter(
            TaskProduct.product_id == product_id,
            TaskProduct.type == 'input'
        ).all()
    else:
        return jsonify({'error': 'Invalid type parameter'}), 400
    
    return jsonify([task.to_dict() for task in tasks])
    
    """

@app.route('/api/products/<int:product_id>/instance/<string:instance_id>/tasks', methods=['GET'])
def get_tasks_for_product_in_context(product_id, instance_id):
    type = request.args.get('type')  # 'input' or 'output'
    if type == 'input':
        tasks = Task.query.join(TaskProduct).filter(
            TaskProduct.product_id == product_id,
            TaskProduct.type == 'output',
            TaskProduct.instance_id == instance_id
        ).all()
    elif type == 'output':
        tasks = Task.query.join(TaskProduct).filter(
            TaskProduct.product_id == product_id,
            TaskProduct.type == 'input',
            TaskProduct.instance_id == instance_id
        ).all()
    else:
        return jsonify({'error': 'Invalid type parameter'}), 400
    
    return jsonify([task.to_dict() for task in tasks])



@app.route('/api/tasks/<int:task_id>/products/<int:product_id>', methods=['DELETE'])
def delete_task_product_relationship(task_id, product_id):
    try:
        task_product = TaskProduct.query.filter_by(task_id=task_id, product_id=product_id).first()
        if not task_product:
            return jsonify({'error': 'Task-Product relationship not found'}), 404

        db.session.delete(task_product)
        db.session.commit()

        return jsonify({'message': f'Relationship between Task {task_id} and Product {product_id} deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/products/<int:product_id>/contexts', methods=['GET'])
def get_product_contexts(product_id):
    """
    Retrieve all unique context IDs related to a specific product.
    """
    try:
        # Check if the product exists
        product = Product.query.get(product_id)
        if not product:
            return jsonify({"error": "Product not found"}), 404

        # Query the TaskProduct table to get distinct context IDs for the product
        contexts = (
            db.session.query(TaskProduct.context_id)
            .filter(TaskProduct.product_id == product_id)
            .distinct()
            .all()
        )

        # Convert the results into a list of context IDs
        context_data = [{"context_id": ctx[0]} for ctx in contexts]

        return jsonify(context_data), 200

    except Exception as e:
        print(f"Error fetching contexts for product {product_id}: {e}")
        return jsonify({"error": "An error occurred while fetching contexts"}), 500




"""
@app.route('/api/tasks/<int:task_id>/output-products', methods=['GET'])
def get_output_products(task_id):
    #Fetch output products (with their deployment states) for a specific task.
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    output_products = [
        {
            "id": tp.product.id,
            "name": tp.product.name,
            "deployment_state": tp.deployment_state,
        }
        for tp in TaskProduct.query.filter_by(task_id=task_id).all()
    ]

    return jsonify({"output_products": output_products})
"""
"""
@app.route('/api/products/<int:product_id>/contexts/<string:context_id>/relationships', methods=['GET'])
def get_relationships_for_product(product_id, context_id):
    input_tasks = Task.query.join(TaskProduct).filter(
        TaskProduct.product_id == product_id,
        TaskProduct.type == 'output',
        TaskProduct.context_id == context_id
    ).all()

    output_tasks = Task.query.join(TaskProduct).filter(
        TaskProduct.product_id == product_id,
        TaskProduct.type == 'input',
        TaskProduct.context_id == context_id
    ).all()

    return jsonify({
        "input_tasks": [task.to_dict() for task in input_tasks],
        "output_tasks": [task.to_dict() for task in output_tasks]
    })
"""
    
@app.route('/api/tasks/<int:task_id>/deployed-products', methods=['GET'])
def get_deployed_products(task_id):
    deployed_input_products = TaskProduct.query.filter_by(
        task_id=task_id, type="input", deployment_state="V"
    ).all()
    deployed_output_products = TaskProduct.query.filter_by(
        task_id=task_id, type="output", deployment_state="V"
    ).all()

    return jsonify({
        "deployed_input_products": [
            {"id": tp.product.id, 
             "name": tp.product.name, 
             "deployment_state": tp.deployment_state}
            for tp in deployed_input_products
        ],
        "deployed_output_products": [
            {"id": tp.product.id, 
             "name": tp.product.name, 
             "deployment_state": tp.deployment_state}
            for tp in deployed_output_products
        ],
    })

"""
@app.route('/api/tasks/<int:task_id>/products', methods=['PATCH'])
def update_task_products(task_id):
    #Attach, delete, or update a product for a task.
    data = request.json
    product_id = data.get("product_id")
    action = data.get("action")  # "add", "delete"
    new_state = data.get("state")  # "V" or "X"
    product_type = data.get("type")  # "input" or "output"

    # Validate inputs
    if not product_type or product_type not in ["input", "output"]:
        return jsonify({"error": "Invalid product type"}), 400

    # Validate task and product
    task = Task.query.get(task_id)
    product = Product.query.get(product_id)

    if not task or not product:
        return jsonify({"error": "Task or Product not found"}), 404

    # Handle "add" action
    if action == "add":
        existing_association = TaskProduct.query.filter_by(
            task_id=task_id, product_id=product_id, type=product_type
        ).first()
        if not existing_association:
            new_association = TaskProduct(
                task_id=task_id,
                product_id=product_id,
                deployment_state="V",  # Default state
                type=product_type,  # Explicitly set the type
            )
            db.session.add(new_association)

    # Handle "delete" action
    elif action == "delete":
        existing_association = TaskProduct.query.filter_by(
            task_id=task_id, product_id=product_id, type=product_type
        ).first()
        if existing_association:
            db.session.delete(existing_association)

    # Handle "update state" action
    elif new_state:
        existing_association = TaskProduct.query.filter_by(
            task_id=task_id, product_id=product_id, type=product_type
        ).first()
        if existing_association:
            existing_association.deployment_state = new_state

    db.session.commit()
    return jsonify({"message": "Product updated successfully"})

"""
@app.route('/api/tasks/<int:task_id>/contexts/<string:context_id>/products', methods=['PATCH'])
def update_task_products_context(task_id, context_id):
    
    #Attach, delete, or update a product for a task within a specific context.
    
    data = request.json
    product_id = data.get("product_id")
    action = data.get("action")  # "add", "delete"
    new_state = data.get("state")  # "V" or "X"
    product_type = data.get("type")  # "input" or "output"
    instance_id = data.get("instance_id")

    # Validate inputs
    if not product_id or not action or not product_type:
        return jsonify({"error": "Missing required fields"}), 400

    if product_type not in ["input", "output"]:
        return jsonify({"error": "Invalid product type"}), 400

    # Validate task and product existence
    task = Task.query.get(task_id)
    product = Product.query.get(product_id)

    if not task:
        return jsonify({"error": "Task not found"}), 404

    if not product:
        return jsonify({"error": "Product not found"}), 404

    # Query for existing task-product association by context
    existing_association = TaskProduct.query.filter_by(
        task_id=task_id, product_id=product_id, type=product_type, context_id=context_id, instance_id = instance_id
    ).first()

    # Handle "add" action
    if action == "add":
        if not existing_association:
            new_association = TaskProduct(
                task_id=task_id,
                product_id=product_id,
                deployment_state="V",  # Default state
                type=product_type,
                context_id=context_id,
                instance_id = instance_id
            )
            db.session.add(new_association)
        else:
            return jsonify({"error": "Product already added for this context"}), 400

    # Handle "delete" action
    elif action == "delete":
        if existing_association:
            db.session.delete(existing_association)
        if not existing_association:
            return jsonify({
                "error": "Product not found for this context",
                "details": {
                    "task_id": task_id,
                    "product_id": product_id,
                    "type": product_type,
                    "context_id": context_id,
                    "instance_id": instance_id,
                }
            }), 404
    # Handle "update state" action
    elif new_state:
        if existing_association:
            existing_association.deployment_state = new_state
        else:
            return jsonify({"error": "Product not found for this context"}), 404

    # Commit changes to the database
    db.session.commit()

    return jsonify({"message": "Product updated successfully"})


@app.route('/api/tasks/<int:task_id>/contexts', methods=['POST'])
def create_context(task_id):
    """
    Create a new context_id for a specific task.
    """
    # Validate task existence
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Generate a new context_id
    new_context_id = str(uuid.uuid4())

    # Return the generated context_id
    return jsonify({"task_id": task_id, "context_id": new_context_id})

@app.route('/api/products/<int:product_id>/instance', methods =['POST'])
def create_instance(product_id):


#Create a new instance for a specific product.

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    new_product_id = str(uuid.uuid4())
    return jsonify ({"product_id": product_id, "instance_id":new_product_id})


@app.route('/api/nest', methods=['POST'])
def nest_tasks():
    data = request.json
    parent_task_id = data.get('parentTaskId')
    nested_task_ids = data.get('nestedTaskIds', [])

    parent_task = Task.query.get(parent_task_id)
    if not parent_task:
        return jsonify({"error": "Parent task not found"}), 404

    for task_id in nested_task_ids:
        task = Task.query.get(task_id)
        if task:
            task.level = parent_task.level + 1
            # Additional logic to reassign input/output products
    db.session.commit()
    return jsonify({"message": "Tasks nested successfully"})

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404

    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted successfully"}), 200
""""
@app.route('/api/tasks/<int:task_id>/products', methods=['DELETE'])
def remove_product_from_task(task_id):
    #Remove a product association (input or output) from a specific task.
    data = request.json
    product_id = data.get("product_id")
    deployment_type = data.get("type")  # "input" or "output"

    task = Task.query.get(task_id)
    product = Product.query.get(product_id)

    if not task or not product:
        return jsonify({"error": "Task or Product not found"}), 404

    # Remove the product association for the specified type
    if deployment_type == "input" and product.input_task_id == task_id:
        product.input_task_id = None
    elif deployment_type == "output" and product.output_task_id == task_id:
        product.output_task_id = None
    else:
        return jsonify({"error": "Invalid deployment type or product-task association"}), 400

    db.session.commit()
    return jsonify({"message": f"Product {product_id} removed from {deployment_type} of task {task_id}"}), 200
"""
@app.route('/api/tasks/<int:task_id>/search', methods=['GET'])
def search_products(task_id):
    """Fetch products not already attached to this task."""
    attached_product_ids = [tp.product_id for tp in TaskProduct.query.filter_by(task_id=task_id).all()]
    query = request.args.get('query', '')

    available_products = Product.query.filter(
        Product.name.ilike(f"%{query}%"),
        ~Product.id.in_(attached_product_ids)
    ).all()

    return jsonify([
        {"id": product.id, "name": product.name}
        for product in available_products
    ])

@app.route('/api/relationships/<int:product_id>', methods=['GET'])
def fetch_relationship_chain(product_id):
    depth = int(request.args.get('depth', 2))
    direction = request.args.get('direction', 'forward')

    def recursive_fetch(prod_id, depth, direction):
        if depth == 0:
            return []
        related = []
        if direction == 'forward':
            tasks = Task.query.join(TaskProduct).filter(
                TaskProduct.product_id == prod_id,
                TaskProduct.type == "output"
            ).all()
            for task in tasks:
                related.append({
                    "task": task.to_dict(),
                    "products": [
                        recursive_fetch(prod.id, depth - 1, direction) for prod in
                        Product.query.join(TaskProduct).filter(
                            TaskProduct.task_id == task.id,
                            TaskProduct.type == "output"
                        ).all()
                    ]
                })
        elif direction == 'reverse':
            # Similar logic for reverse direction
            pass
        return related

    chain = recursive_fetch(product_id, depth, direction)
    return jsonify(chain)


# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path and os.path.exists(f"frontend/build/{path}"):
        return send_from_directory('frontend/build', path)
    return send_from_directory('frontend/build', 'index.html')

if __name__ == '__main__':
    with app.app_context():
        db.drop_all()
        db.create_all()
    app.run(debug=True)