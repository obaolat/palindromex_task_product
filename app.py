from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate 
import os

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
    type = db.Column(db.String(10))

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
        db.session.add(new_product)
        db.session.commit()

        return jsonify({"message": "Product created", "product_id": new_product.id}), 201




"""@app.route('/api/tasks/<int:task_id>/products', methods=['GET'])
def get_task_products(task_id):
    #Fetch all products specifically associated with a task.
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Filter products associated with this task
    input_products = [
        {
            "id": product.id,
            "name": product.name,
            "input_task_id": product.input_task_id,
            "input_task_deployed": product.input_task_deployed,  # V or X
        }
        for product in Product.query.filter_by(input_task_id=task_id)
    ]


    output_products = [
        {
            "id": product.id,
            "name": product.name,
            "output_task_deployed": product.output_task_deployed,  # Keep track of V or X
        }
        for product in Product.query.filter_by(output_task_id=task_id)
    ]

    return jsonify({
        "input_products": input_products,
        "output_products": output_products,
    }) """
    
    
@app.route('/api/tasks/<int:task_id>/products', methods=['GET'])
def get_task_products(task_id):
    """Fetch input and output products for a specific task."""
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


@app.route('/api/tasks/<int:task_id>/products', methods=['PATCH'])
def update_task_products(task_id):
    """Attach, delete, or update a product for a task."""
    data = request.json
    product_id = data.get("product_id")
    action = data.get("action")  # "add", "delete"
    new_state = data.get("state")  # "V" or "X"
    product_type = data.get("type")

    # Validate task and product
    task = Task.query.get(task_id)
    product = Product.query.get(product_id)

    if not task or not product:
        return jsonify({"error": "Task or Product not found"}), 404

    # Handle "add" action
    if action == "add":
        existing_association = TaskProduct.query.filter_by(task_id=task_id, product_id=product_id).first()
        if not existing_association:
            new_association = TaskProduct(
                task_id=task_id,
                product_id=product_id,
                deployment_state="V", # Default state
                type =product_type
                
            )
            db.session.add(new_association)

    # Handle "delete" action
    elif action == "delete":
        existing_association = TaskProduct.query.filter_by(task_id=task_id, product_id=product_id).first()
        if existing_association:
            db.session.delete(existing_association)

    # Handle "update state" action
    elif new_state:
        existing_association = TaskProduct.query.filter_by(task_id=task_id, product_id=product_id).first()
        if existing_association:
            existing_association.deployment_state = new_state

    db.session.commit()
    return jsonify({"message": "Product updated successfully"})



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

@app.route('/api/tasks/<int:task_id>/products', methods=['DELETE'])
def remove_product_from_task(task_id):
    """Remove a product association (input or output) from a specific task."""
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