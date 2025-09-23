# CheckMyCert Deployment Guide

## Prerequisites

- Docker and Docker Compose
- PostgreSQL 13+
- Redis 6+
- Python 3.9+
- Node.js 18+
- SSL certificate for production

## Environment Setup

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/your-org/checkmycert.git
cd checkmycert
\`\`\`

### 2. Environment Variables

Copy the example environment file and configure:

\`\`\`bash
cp .env.example .env
\`\`\`

Required environment variables:

\`\`\`env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/checkmycert
REDIS_URL=redis://localhost:6379/0

# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# JWT Settings
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=86400

# OCR Services
TESSERACT_PATH=/usr/bin/tesseract
EASYOCR_GPU=False

# Email Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Storage (Production)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=checkmycert-files
AWS_S3_REGION_NAME=us-east-1

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
\`\`\`

## Development Deployment

### 1. Start Services

\`\`\`bash
docker-compose up -d
\`\`\`

### 2. Run Migrations

\`\`\`bash
docker-compose exec backend python manage.py migrate
\`\`\`

### 3. Create Superuser

\`\`\`bash
docker-compose exec backend python manage.py createsuperuser
\`\`\`

### 4. Load Demo Data

\`\`\`bash
docker-compose exec backend python manage.py setup_demo
\`\`\`

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Admin Panel: http://localhost:8000/admin

## Production Deployment

### 1. Server Setup (Ubuntu 20.04+)

\`\`\`bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt install nginx -y
\`\`\`

### 2. SSL Certificate

\`\`\`bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
\`\`\`

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/checkmycert`:

\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # File upload size
        client_max_body_size 10M;
    }

    # Static files
    location /static/ {
        alias /var/www/checkmycert/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/checkmycert/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
\`\`\`

Enable the site:

\`\`\`bash
sudo ln -s /etc/nginx/sites-available/checkmycert /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### 4. Production Docker Compose

Create `docker-compose.prod.yml`:

\`\`\`yaml
version: '3.8'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: checkmycert
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media
    depends_on:
      - db
      - redis
    restart: unless-stopped

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A checkmycert worker -l info
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    restart: unless-stopped

volumes:
  postgres_data:
  static_volume:
  media_volume:
\`\`\`

### 5. Deploy Application

\`\`\`bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Create superuser
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
\`\`\`

## Monitoring and Maintenance

### 1. Health Checks

Create health check endpoints:

\`\`\`bash
# Check backend health
curl https://yourdomain.com/api/health/

# Check frontend
curl https://yourdomain.com/api/health/frontend
\`\`\`

### 2. Log Management

\`\`\`bash
# View logs
docker-compose logs -f backend
docker-compose logs -f celery
docker-compose logs -f frontend

# Log rotation
sudo logrotate -f /etc/logrotate.d/docker-containers
\`\`\`

### 3. Backup Strategy

\`\`\`bash
# Database backup
docker-compose exec db pg_dump -U ${DB_USER} checkmycert > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec db pg_dump -U ${DB_USER} checkmycert > ${BACKUP_DIR}/db_backup_${DATE}.sql
find ${BACKUP_DIR} -name "db_backup_*.sql" -mtime +7 -delete
\`\`\`

### 4. Updates and Scaling

\`\`\`bash
# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Scale workers
docker-compose -f docker-compose.prod.yml up -d --scale celery=3
\`\`\`

## Security Considerations

1. **Firewall Configuration**
   \`\`\`bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   \`\`\`

2. **Regular Updates**
   \`\`\`bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull
   \`\`\`

3. **SSL Certificate Renewal**
   \`\`\`bash
   sudo certbot renew --dry-run
   \`\`\`

4. **Database Security**
   - Use strong passwords
   - Enable SSL connections
   - Regular security updates

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   \`\`\`bash
   docker-compose logs db
   docker-compose exec backend python manage.py dbshell
   \`\`\`

2. **Celery Worker Issues**
   \`\`\`bash
   docker-compose logs celery
   docker-compose exec celery celery -A checkmycert inspect active
   \`\`\`

3. **File Upload Issues**
   - Check Nginx client_max_body_size
   - Verify storage permissions
   - Check disk space

4. **Performance Issues**
   - Monitor resource usage: `docker stats`
   - Scale workers: `docker-compose up -d --scale celery=3`
   - Optimize database queries
