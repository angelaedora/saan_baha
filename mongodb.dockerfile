FROM mongo:latest

# Create directory for MongoDB data
RUN mkdir -p /data/db

# Expose MongoDB port
EXPOSE 27017

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=pass123

# Start MongoDB
CMD ["mongod", "--bind_ip_all"]
