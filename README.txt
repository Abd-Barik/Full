check python version for 3.11.9
check odbc driver downloaded (version 17)
 C:\Users\bariq\AppData\Local\Programs\Python\Python311\python.exe -m venv venv (to create venv)
make sure to delete venv before to avoid conflict
venv/Scripts/activate
pip install -r requirements/base.txt
pip install -r requirements/local.txt
pip install -r requirements/production.txt

python manage.py migrate

python manage.py runserver