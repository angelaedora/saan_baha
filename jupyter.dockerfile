FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y build-essential swig python3-dev python3-pip python3-setuptools python3-wheel \
    libspatialindex-dev libgeos-dev libproj-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install specific versions of packages to avoid compatibility issues
RUN pip install --upgrade pip
RUN pip install numpy
RUN pip install scipy
RUN pip install scikit-learn
RUN pip install pandas
RUN pip install pynacl
RUN pip install pyopenssl
RUN pip install bayesian-optimization
RUN pip install matplotlib
RUN pip install seaborn
RUN pip install geopandas
RUN pip install osmnx
RUN pip install pymongo
RUN pip install jupyter
RUN pip install tqdm
RUN pip install fiona
RUN pip install shapely
RUN pip install contextily
RUN pip install branca
RUN pip install folium
RUN pip install tensorflow
RUN pip install shap
RUN pip install statsmodels
RUN pip install xgboost
RUN pip install lightgbm
RUN pip install catboost
RUN pip install imbalanced-learn
RUN pip install optuna
RUN pip install ucimlrepo
RUN pip install pymc
RUN pip install arviz

# Set up a working directory
WORKDIR /workspace

# Expose Jupyter port
EXPOSE 8888

CMD ["jupyter", "notebook", "--ip=0.0.0.0", "--allow-root", "--no-browser"]