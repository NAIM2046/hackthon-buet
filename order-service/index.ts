import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { prisma } from './lib/prisma';
import { OrderStatus } from './generated/prisma/client';




const app = express();

app.use(cors());
app.use(express.json());


const INVENTORY_URL = process.env.INVENTORY_URL || "https://valerix-inventory.onrender.com/update-inventory";

// --- RETRY LOGIC ---
async function callInventory(payload: any, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔄 Calling Inventory (Attempt ${i+1})...`);
            const response = await axios.post(INVENTORY_URL, payload, { timeout: 2000 });
            return response.data;
        } catch (e: any) {
            console.log(`⚠️ Inventory Attempt ${i + 1} failed: ${e.message}`);
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

app.post('/create-order', async (req: Request, res: Response): Promise<any> => {
    const { orderId, userId, productId, quantity, price } = req.body;
    console.log(`📝 Processing Order: ${orderId}`);

    try {
        const totalAmount = price ? (price * quantity) : 0;

     
        console.log("1. Saving to DB (PENDING)...");
        await prisma.order.create({
            data: {
                orderId,
                userId: userId || "GUEST",
                productId,
                quantity,
                price: price || 0,
                totalAmount,
                status: OrderStatus.PENDING 
            }
        });

     
        console.log("2. Calling Inventory...");
        await callInventory({ orderId, productId, quantity });

       
        console.log("3. Updating to CONFIRMED...");
        await prisma.order.update({
            where: { orderId },
            data: { status: OrderStatus.CONFIRMED }
        });

        console.log(`✅ Success: ${orderId}`);
        return res.json({ status: "Success", orderId });

    } catch (e: any) {
        // --- CRITICAL FIX: PRINT THE REAL ERROR ---
        console.error(`❌ FAILED DETAILED LOG:`, e); 
        

        try {
            await prisma.order.update({
                where: { orderId },
                data: { status: OrderStatus.FAILED }
            });
        } catch (dbError) {
            // DB te save e hoyni, tai update kora jabe na
        }

        return res.status(503).json({ error: "Order Processing Failed" });
    }
});

app.get('/health', async (req, res) => {
    try {
       
        await prisma.order.findFirst();
        res.status(200).json({ status: "UP", database: "Connected" });
    } catch (e) {
        res.status(500).json({ status: "DOWN", database: "Disconnected" });
    }
});

app.listen(3000, () => console.log("Order Service running on 3000"));