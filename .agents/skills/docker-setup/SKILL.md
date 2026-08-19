---
name: docker-setup
description: Guide and cheatsheet for Docker and Docker Compose workflows, container management, deployment on SSH servers, environment configuration, and troubleshooting.
---

# 🐳 Docker & Docker Compose Cheatsheet & Guide

This skill provides standard operating procedures, CLI commands, and deployment patterns for Docker and Docker Compose environments (including Node.js/Express, Python scrapers, and web services).

---

## 1. Essential Docker Inspection & Management

### Listing Containers
```bash
# View all currently running containers
docker ps

# View all containers (running + stopped/exited)
docker ps -a
```

### Resource & Log Monitoring
```bash
# Real-time resource usage (CPU, Memory, Network I/O)
docker stats

# Stream live container logs
docker logs -f <container_name_or_id>

# Inspect last 100 log lines
docker logs --tail 100 <container_name_or_id>
```

### Stopping & Cleaning Up
```bash
# Stop a running container
docker stop <container_name_or_id>

# Remove a stopped container
docker rm <container_name_or_id>

# Prune unused containers, networks, and dangling images
docker system prune -f
```

---

## 2. Docker Compose Workflows

### Starting Services
```bash
# Build and run containers in detached (background) mode
docker compose up --build -d

# Start without rebuilding
docker compose up -d

# View status of compose services
docker compose ps
```

### Stopping & Restarting Services
```bash
# Stop services without deleting containers
docker compose stop

# Stop and remove containers, networks, and volumes
docker compose down

# Restart services
docker compose restart
```

### Shell Access Inside Containers
```bash
# Execute bash/sh inside a running service
docker compose exec <service_name> sh
# Or with docker directly:
docker exec -it <container_name_or_id> /bin/sh
```

---

## 3. Production Remote Server (SSH) Deployment Workflow

When updating or deploying a dockerized project (e.g. Express backend) on a remote SSH server:

### 1. Backup Environment Variables
```bash
cp path/to/app/.env ~/.env.app.backup
```

### 2. Pull / Clone Latest Code from GitHub
```bash
cd ~/your-repo
git pull origin main
# OR if fresh clone:
# git clone https://github.com/username/repo.git ~/your-repo
```

### 3. Restore Environment File
```bash
cp ~/.env.app.backup ~/your-repo/express/.env
```

### 4. Build and Launch Containers
```bash
cd ~/your-repo/express
docker compose up --build -d
```

### 5. Verify Health & Logs
```bash
docker compose ps
docker logs -f <container_name>
```
