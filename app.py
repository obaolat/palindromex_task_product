from flask import Flask, request, jsonify, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from os import environ

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:yourpassword@localhost:5432/task_manager'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db=SQLAlchemy(app)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    level = db.Column(db.Integer, default=1)
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    input_products = db.relationship('Product', foreign_keys='Product.input_task_id', backref='input_task', lazy=True)
    output_products = db.relationship('Product', foreign_keys='Product.output_task_id', backref='output_task', lazy=True)

    
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    creation_time = db.Column(db.DateTime)
    cost = db.Column(db.Numeric)
    input_task_id = db.Column(db.Integer, db.ForeignKey('task.id'))
    output_task_id = db.Column(db.Integer, db.ForeignKey('task.id'))



@app.route('/tasks', methods=['GET', 'POST'])
def tasks():
    if request.method == 'GET':
        tasks = Task.query.all()
        return jsonify([{
            "id": task.id,
            "name": task.name,
            "level": task.level,
            "start_time": task.start_time,
            "end_time": task.end_time,
            "cost": str(task.cost)
        } for task in tasks])
    elif request.method == 'POST':
        data = request.json
        new_task = Task(name=data['name'], level=data.get('level', 1), start_time=data['start_time'],
            end_time=data['end_time'],
            cost=data['cost'])
        db.session.add(new_task)
        db.session.commit()
        return jsonify({"message": "Task created", "task_id": new_task.id}), 201
    
@app.route('/')
def index():
    return "Welcome to the Task Manager API!"

@app.route('/products', methods=['GET', 'POST'])
def products():
    if request.method == 'GET':
        products = Product.query.all()
        return jsonify([{
            "id": product.id,
            "name": product.name,
            "creation_time": product.creation_time,
            "cost": str(product.cost),
            "input_task_id": product.input_task_id,
            "output_task_id": product.output_task_id
        } for product in products])
    
    elif request.method == 'POST':
        data = request.json
        # Check if input_task_id and output_task_id are provided
        input_task = Task.query.get(data.get('input_task_id'))  # Fetch the task by ID if provided
        output_task = Task.query.get(data.get('output_task_id'))  # Same for output task

        # Create the new product
        new_product = Product(
            name=data['name'],
            creation_time=data['creation_time'],
            cost=data['cost'],
            input_task_id=input_task.id if input_task else None,
            output_task_id=output_task.id if output_task else None
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify({"message": "Product created", "product_id": new_product.id}), 201

    
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
