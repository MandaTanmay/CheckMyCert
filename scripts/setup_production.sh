#!/bin/bash

# CheckMyCert Production Setup Script
set -e

echo "🚀 Setting up CheckMyCert for production..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

echo "🐳 Setting up Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo "🔒 Setting up SSL certificate..."
if [ ! -z "$DOMAIN" ]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL
fi

echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/checkmycert > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 10M;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/checkmycert /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "🏗️ Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to start..."
sleep 30

echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate

echo "📁 Collecting static files..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

echo "👤 Creating superuser..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='$ADMIN_EMAIL').exists():
    User.objects.create_superuser('$ADMIN_EMAIL', '$ADMIN_PASSWORD')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
EOF

echo "🎯 Loading demo data..."
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py setup_demo

echo "🔥 Setting up firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "✅ Production setup complete!"
echo ""
echo "🌐 Your CheckMyCert instance is now available at: https://$DOMAIN"
echo "🔧 Admin panel: https://$DOMAIN/admin"
echo "📊 API documentation: https://$DOMAIN/api/docs"
echo ""
echo "📝 Next steps:"
echo "1. Configure your email settings in the admin panel"
echo "2. Add institution verification endpoints"
echo "3. Set up monitoring and backups"
echo "4. Review security settings"
