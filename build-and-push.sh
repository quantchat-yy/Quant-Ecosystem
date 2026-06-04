#!/bin/bash
set -e

REGISTRY="650708167640.dkr.ecr.us-east-1.amazonaws.com"

echo "Logging in to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $REGISTRY

echo "Pushing quant-ws-gateway..."
docker push $REGISTRY/quant-ws-gateway:latest

echo "Building and pushing quantchat..."
docker build -t $REGISTRY/quant-quantchat:latest -f apps/quantchat/Dockerfile .
docker push $REGISTRY/quant-quantchat:latest

echo "Building and pushing quantmail..."
docker build -t $REGISTRY/quant-quantmail:latest -f apps/quantmail/Dockerfile .
docker push $REGISTRY/quant-quantmail:latest

echo "Building and pushing quantai..."
docker build -t $REGISTRY/quant-quantai:latest -f apps/quantai/Dockerfile .
docker push $REGISTRY/quant-quantai:latest

echo "Building and pushing admin..."
docker build -t $REGISTRY/quant-admin:latest -f apps/admin/Dockerfile .
docker push $REGISTRY/quant-admin:latest

echo "All images built and pushed successfully!"
