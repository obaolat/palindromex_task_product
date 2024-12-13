from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:yourpassword@localhost:5432/task_manager'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    level = db.Column(db.Integer, default=1)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    currency = db.Column(db.String(10), default="USD")
    input_products = db.relationship('Product', foreign_keys='Product.input_task_id', backref='input_task', lazy=True)
    output_products = db.relationship('Product', foreign_keys='Product.output_task_id', backref='output_task', lazy=True)

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    creation_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    currency = db.Column(db.String(10), default="USD")
    input_task_id = db.Column(db.Integer, db.ForeignKey('task.id'))
    output_task_id = db.Column(db.Integer, db.ForeignKey('task.id'))

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

        # Attach all existing products to the new task by default as input products
        all_products = Product.query.all()
        for product in all_products:
            if product.input_task_id is None:
                product.input_task_id = new_task.id  # Associate the product with the new task as input
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
                "input_task_id": product.input_task_id,
                "output_task_id": product.output_task_id,  # Include output association
            }
            for product in products
        ])
    elif request.method == 'POST':
        data = request.json

        # Create the new product
        new_product = Product(
            name=data['name'],
            creation_time=data.get('creation_time'),
            cost=data['cost'],
            currency=data.get('currency', 'USD')
        )
        db.session.add(new_product)
        db.session.commit()

        # Attach the new product to all tasks as both input and output
        all_tasks = Task.query.all()
        for task in all_tasks:
            if new_product.input_task_id is None:
                new_product.input_task_id = task.id  # Associate the product as input
            if new_product.output_task_id is None:
                new_product.output_task_id = task.id  # Associate the product as output
        db.session.commit()

        return jsonify({"message": "Product created", "product_id": new_product.id}), 201


@app.route('/api/tasks/<int:task_id>/products', methods=['GET'])
def get_task_products(task_id):
    """Fetch all products associated with a task."""
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404

    # Get all products and indicate deployment status for input and output
    products = Product.query.all()
    product_list = [
        {
            "id": product.id,
            "name": product.name,
            "input_deployed": "V" if product.input_task_id == task_id else "X",
            "output_deployed": "V" if product.output_task_id == task_id else "X",
            "input_task_id": product.input_task_id,
            "output_task_id": product.output_task_id,
        }
        for product in products
    ]

    return jsonify(product_list)


@app.route('/api/tasks/<int:task_id>/products/<int:product_id>', methods=['PATCH'])
def update_task_products(task_id, product_id):
    """Toggle the deployed status of a product for a specific task."""
    task = Task.query.get(task_id)
    product = Product.query.get(product_id)
    data = request.json

    if not task or not product:
        return jsonify({"error": "Task or Product not found"}), 404

    # Determine type of deployment toggle (input or output)
    deployment_type = data.get("type")
    if deployment_type == "input":
        if product.input_task_id == task_id:
            product.input_task_id = None  # Remove input association
        else:
            product.input_task_id = task.id  # Add input association
    elif deployment_type == "output":
        if product.output_task_id == task_id:
            product.output_task_id = None  # Remove output association
        else:
            product.output_task_id = task.id  # Add output association
    else:
        return jsonify({"error": "Invalid deployment type"}), 400

    db.session.commit()
    return jsonify({"message": f"{deployment_type.capitalize()} deployment status updated"})


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
