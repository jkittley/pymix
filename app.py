from flask import Flask, render_template
from unipath import Path
app = Flask(__name__, template_folder=Path().absolute())

@app.route('/')
def hello_world():
    return render_template('index.html')
