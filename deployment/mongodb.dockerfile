FROM mongo:latest

# Create MongoDB data directory
RUN mkdir -p /data/db

# Expose default MongoDB port
EXPOSE 27017

# Default credentials (can be overridden in docker-compose)
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=pass123

# Start MongoDB
CMD ["mongod", "--bind_ip_all"]
