# inventory-service/Dockerfile
FROM node:18-alpine

WORKDIR /app

# ডিপেন্ডেন্সি কপি এবং ইনস্টল
COPY package*.json ./
RUN npm install

# প্রিজমা স্কিমা কপি এবং ক্লায়েন্ট জেনারেট
COPY prisma ./prisma/
RUN npx prisma generate

# বাকি সোর্স কোড কপি
COPY . .

# পোর্ট এক্সপোজ
EXPOSE 4000

# সার্ভার স্টার্ট কমান্ড
CMD ["npx", "tsx", "index.ts"]